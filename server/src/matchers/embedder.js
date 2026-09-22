// Turning text into vectors. One provider today; the point of the file is
// that the matcher never talks to OpenAI directly, so a second provider (or
// a local model, or a stub in a test) is a change here and nowhere else.
//
// Nothing in this file is allowed to be called on a request path. Embedding
// happens in the hourly wantedMatch job, where a slow or failed call costs a
// retry an hour later rather than a student staring at a spinner while they
// post a listing.

const { winstonLogger } = require('../middleware/logger');

// 256 rather than the default 1536. text-embedding-3-small is trained so
// that a shortened vector still works (Matryoshka representation), and 256
// is ample for "is this listing about the same thing as that request" while
// storing six times less: 1536 doubles is ~12KB per listing, which is more
// than the listing itself.
const DIMENSIONS = 256;
const MODEL = 'text-embedding-3-small';

// One input per listing, and the API takes an array, so a whole backfill is
// a handful of calls rather than one per row.
const BATCH = 96;

let client = null;

// A real OpenAI key is ~50+ characters and starts with "sk-". This repo's
// .env currently holds a 19-character placeholder, and a placeholder has to
// read as "no provider configured" rather than blowing up inside the job —
// the matcher falls back to the keyword one when this returns false.
const isAvailable = () => {
  const key = process.env.OPENAI_API_KEY || '';
  return key.startsWith('sk-') && key.length >= 40;
};

const getClient = () => {
  if (!client) {
    // Required lazily so importing this file costs nothing when no key is
    // set, which is the normal case in tests and in development.
    const OpenAI = require('openai');
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

/**
 * Embeds a list of strings, in order.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} one vector per input, same order
 * @throws if the provider is unreachable — the caller decides what to do,
 *         because "carry on without embeddings" is a matcher decision, not
 *         an embedder one.
 */
const embed = async (texts) => {
  if (!texts.length) return [];
  if (!isAvailable()) throw new Error('No embedding provider configured (OPENAI_API_KEY)');

  const out = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await getClient().embeddings.create({
      model: MODEL,
      dimensions: DIMENSIONS,
      // The API rejects an empty string. A listing with no description still
      // has a title, but belt and braces.
      input: slice.map((t) => String(t || '').slice(0, 8000) || ' '),
    });

    // The API documents that `data` comes back in input order, but it also
    // carries an index on every row. Sorting by it costs nothing and means a
    // reordered response could never silently attach the wrong vector to the
    // wrong listing — which would be invisible except as bad matches.
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    for (const row of sorted) out.push(row.embedding);
  }

  if (out.length !== texts.length) {
    throw new Error(`Embedder returned ${out.length} vectors for ${texts.length} inputs`);
  }

  return out;
};

// Used by the matcher to log which way a run went, and by the compare script.
const describe = () => ({ name: 'openai', model: MODEL, dimensions: DIMENSIONS });

const warnUnavailableOnce = (() => {
  let warned = false;
  return () => {
    if (warned) return;
    warned = true;
    winstonLogger.warn(
      'Semantic matcher asked for, but no embedding provider is configured — falling back to the keyword matcher'
    );
  };
})();

module.exports = { embed, isAvailable, describe, warnUnavailableOnce, MODEL, DIMENSIONS, BATCH };
