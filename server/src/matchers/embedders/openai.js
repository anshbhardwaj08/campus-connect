// OpenAI embeddings. One provider; ../embedder.js picks between them.
//
// Paid — there is no free API tier — but the amounts here are trivial:
// text-embedding-3-small is $0.02 per million tokens, so a campus-sized
// board costs a fraction of a cent to embed. See ./gemini.js for the free
// alternative.
//
// Nothing in this file is allowed to be called on a request path. Embedding
// happens in the hourly wantedMatch job, where a slow or failed call costs a
// retry an hour later rather than a student staring at a spinner while they
// post a listing.

// 256 rather than the default 1536. text-embedding-3-small is trained so
// that a shortened vector still works (Matryoshka representation), and 256
// is ample for "is this listing about the same thing as that request" while
// storing six times less: 1536 doubles is ~12KB per listing, which is more
// than the listing itself.
const { isPlausibleKey } = require('./keyShape');

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
// `sk-` is one prefix OpenAI has actually stuck to, so it is worth keeping
// here — but the placeholder check in ./keyShape.js is what does the real
// work. This repo's .env held "your-openai-key" for months.
const isAvailable = () =>
  isPlausibleKey(process.env.OPENAI_API_KEY, { minLength: 40, prefix: 'sk-' });

// `embed` takes a second argument in the provider contract (see
// ../embedder.js) saying whether these are queries or documents. OpenAI has
// no such distinction — one model, one space — so it is accepted and
// ignored rather than made to be somebody else's problem.

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
// The model id is prefixed with the provider so that a cached vector from
// Gemini is never compared against one from OpenAI — different spaces, and
// the numbers would look plausible while meaning nothing.
const describe = () => ({ name: 'openai', model: `openai:${MODEL}`, dimensions: DIMENSIONS });

module.exports = { embed, isAvailable, describe, MODEL, DIMENSIONS, BATCH };
