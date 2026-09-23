// Google Gemini embeddings. One provider; ../embedder.js picks between them.
//
// The reason to prefer this one here: the free tier needs no card and no
// billing account, which for a student project is the difference between
// "we can run this" and "we cannot". Quality for short-text retrieval is
// comparable to OpenAI's small model.
//
// No SDK. This is two HTTP calls against a documented JSON API, and Node 22
// has fetch built in — a dependency for that would be more code to audit,
// not less.

const { isPlausibleKey } = require('./keyShape');

// `text-embedding-004` was the obvious name and this key's API does not
// serve it — it answers 404 and says to call ListModels, which is worth
// doing rather than guessing if this ever breaks again:
//
//   node -e "require('dotenv').config(); fetch('https://generativelanguage.
//   googleapis.com/v1beta/models', { headers: { 'x-goog-api-key':
//   process.env.GEMINI_API_KEY } }).then(r => r.json()).then(b =>
//   console.log(b.models.filter(m => m.supportedGenerationMethods.some(x =>
//   /embed/i.test(x))).map(m => m.name)))"
//
// This model returns 3072 dimensions by default, which is 24KB a listing —
// more than the listing. `outputDimensionality` truncates it. Google notes
// that a truncated vector is no longer unit length and should be
// normalised; cosine() divides by magnitude anyway, so that is handled.
const MODEL = 'gemini-embedding-001';
const DIMENSIONS = 768;

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

// The batch endpoint takes up to 100 requests. 96 leaves room and matches
// what the other provider uses.
const BATCH = 96;

// Retrieval works better when the question and the thing being searched are
// embedded differently — Google trains these task types so a short query
// lands near the longer documents that answer it, rather than near other
// short queries. Both still live in one space, which is the whole point.
const TASK_TYPE = {
  query: 'RETRIEVAL_QUERY',
  document: 'RETRIEVAL_DOCUMENT',
};

// No prefix check. Google has issued at least two shapes — `AIza...` at 39
// characters and `AQ....` at 53 — and requiring the older one made a real
// key read as "no provider configured", so the matcher fell back silently
// with nothing in the log to say why. See ./keyShape.js.
const isAvailable = () => isPlausibleKey(process.env.GEMINI_API_KEY, { minLength: 30 });

/**
 * @param {string[]} texts
 * @param {'query'|'document'} kind  what these texts are, so the right task
 *                                   type is used. Defaults to document.
 * @returns {Promise<number[][]>} one vector per input, in order
 */
const embed = async (texts, { kind = 'document' } = {}) => {
  if (!texts.length) return [];
  if (!isAvailable()) throw new Error('No embedding provider configured (GEMINI_API_KEY)');

  const out = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);

    const res = await fetch(`${ENDPOINT}:batchEmbedContents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In the header, NOT as ?key= in the URL. Google accepts both, but a
        // failed fetch puts the URL in the error message, and that message
        // ends up in the log — which is exactly how the Redis password got
        // written to a log file on this project once already.
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        requests: slice.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text: String(text || '').slice(0, 8000) || ' ' }] },
          taskType: TASK_TYPE[kind] || TASK_TYPE.document,
          outputDimensionality: DIMENSIONS,
        })),
      }),
    });

    if (!res.ok) {
      // Read the body for the reason (quota, bad key, model name) but keep
      // it short: it is going into a log.
      const detail = await res.text().catch(() => '');
      throw new Error(`Gemini embeddings ${res.status}: ${detail.slice(0, 200)}`);
    }

    const body = await res.json();
    const rows = body.embeddings || [];

    // Unlike OpenAI's, this response carries no index — the contract is that
    // it comes back in request order. There is nothing to verify that
    // against, so the length check below is the only guard, and a mismatch
    // has to be an error rather than a silent shift that would attach every
    // vector to the wrong listing.
    for (const row of rows) out.push(row.values);
  }

  if (out.length !== texts.length) {
    throw new Error(`Embedder returned ${out.length} vectors for ${texts.length} inputs`);
  }

  return out;
};

const describe = () => ({ name: 'gemini', model: `gemini:${MODEL}`, dimensions: DIMENSIONS });

module.exports = { embed, isAvailable, describe, MODEL, DIMENSIONS, BATCH };
