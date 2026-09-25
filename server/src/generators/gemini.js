// Text generation via Gemini. Deliberately built the same shape as
// matchers/embedders/gemini.js — same key, same header rule, same no-SDK
// decision — so the two read as one thing rather than two integrations.
//
// This is the "G" in RAG. Everything before it (finding the listings, pasting
// them into the prompt) is retrieval and string building; this is the only
// part that needs a model.

const { isPlausibleKey } = require('../matchers/embedders/keyShape');

// A LIST, not a model — because on the free tier a single model name is not
// a dependable thing. Measured on 2026-09-23 with a fresh key:
//
//   gemini-2.5-flash, gemini-2.5-flash-lite   404, "no longer available to
//                                             new users" — retired under a
//                                             pinned name, exactly the trap
//   gemini-3.5-flash-lite, 3.1-flash-lite,
//   3.8-flash, flash-latest                   503, "experiencing high demand"
//   gemini-flash-lite-latest                  200 in 36s
//   gemini-3.6-flash                          200 in 41s
//
// So: try them in order, move on from a 404 or a 503, and stop at the first
// that answers. Whichever wins is remembered for the rest of the process, so
// a run of twenty listings does not re-probe a dead model twenty times.
//
// `-latest` aliases first. A pinned version is eventually retired and comes
// back as a 404, which in this codebase means quietly falling back to the
// hand-written map — the same failure that `text-embedding-004` already cost
// an afternoon.
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-flash-latest'];

const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Ninety seconds, which is absurd for a web request and correct here. The
// free tier answered a trivial prompt in 36 seconds; at the 20s this
// originally used, every single call timed out and every listing silently
// fell back to the map. Nothing waits on this — it runs in an hourly job —
// so the only thing a short timeout buys is a worse answer.
const TIMEOUT_MS = 90000;

// Worth retrying a different model for; anything else is a real error.
const TRY_NEXT = new Set([404, 429, 500, 502, 503, 504]);

let preferred = null;

const isAvailable = () => isPlausibleKey(process.env.GEMINI_API_KEY, { minLength: 30 });

/**
 * Asks for JSON and gets JSON.
 *
 * `responseMimeType` makes the API return a bare JSON document rather than
 * prose with a fenced block in it, so there is no need to hunt for ```json
 * and hope. A schema is passed too — the model is then constrained rather
 * than merely asked, which is the difference between parsing usually
 * working and parsing always working.
 *
 * @param {string} prompt
 * @param {object} schema     an OpenAPI-ish schema; see the caller
 * @returns {Promise<any>}    the parsed JSON
 */
const askOne = async (model, prompt, schema) =>
  fetch(endpointFor(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Header, never `?key=` in the URL: a failed fetch puts the URL into
      // the error message and the message goes to the log file.
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // Low, not zero. This is a judgement about what goes with what, and
        // it should be the same judgement tomorrow as today.
        temperature: 0.2,
        // Without this the model replies in prose with a fenced block in it
        // and the caller has to go hunting for ```json. It also, measurably,
        // returns far faster.
        responseMimeType: 'application/json',
        ...(schema ? { responseSchema: schema } : {}),
        maxOutputTokens: 800,
      },
    }),
  });

const generateJson = async (prompt, schema) => {
  if (!isAvailable()) throw new Error('No generator configured (GEMINI_API_KEY)');

  const order = preferred ? [preferred, ...MODELS.filter((m) => m !== preferred)] : MODELS;
  let res = null;
  let lastProblem = 'no model answered';

  for (const model of order) {
    try {
      const attempt = await askOne(model, prompt, schema);
      if (attempt.ok) {
        preferred = model;
        res = attempt;
        break;
      }
      const detail = await attempt.text().catch(() => '');
      lastProblem = `${model} ${attempt.status}: ${detail.slice(0, 120)}`;
      if (!TRY_NEXT.has(attempt.status)) break;
    } catch (err) {
      // A timeout on an overloaded model is worth trying the next one for.
      lastProblem = `${model}: ${err.message}`;
    }
  }

  if (!res) throw new Error(`Gemini generate failed (${lastProblem})`);

  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;

  // A response with no text is usually a safety block or a finishReason of
  // MAX_TOKENS. Either way there is nothing to parse, and the caller's
  // fallback is a better answer than a crash.
  if (!text) {
    const why = body?.candidates?.[0]?.finishReason || body?.promptFeedback?.blockReason || 'no text';
    throw new Error(`Gemini generate returned nothing (${why})`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini generate returned unparseable JSON: ${text.slice(0, 120)}`);
  }
};

const describe = () => ({ name: 'gemini', model: `gemini:${preferred || MODELS[0]}` });

module.exports = { generateJson, isAvailable, describe, MODELS, TIMEOUT_MS };
