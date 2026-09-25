// The generation seam, built to match matchers/embedder.js.
//
// The contract a generator meets:
//
//   isAvailable()              -> boolean. False means "not configured",
//                                 never an error — the caller falls back
//   describe()                 -> { name, model }
//   generateJson(prompt, schema) -> Promise<parsed JSON>, or throws
//
// One provider today. A second (a local Ollama, another hosted model) is a
// file in ./ and a line in PROVIDERS — the callers do not change, exactly as
// adding Gemini alongside OpenAI did not change the matcher.
//
// Note what is NOT here: no prompt, no schema, no idea what a listing is. A
// generator knows how to ask a model for JSON and nothing else. What to ask
// belongs with the feature — see services/crossSell.service.js — because
// that is the part that changes when the feature changes.

const gemini = require('./gemini');

const PROVIDERS = { gemini };
const ORDER = ['gemini'];

const active = () => {
  const forced = process.env.GENERATOR;
  if (forced) return PROVIDERS[forced] || null;
  return ORDER.map((name) => PROVIDERS[name]).find((p) => p.isAvailable()) || null;
};

const isAvailable = () => Boolean(active()?.isAvailable());

const describe = () => active()?.describe() || { name: 'none', model: 'none' };

const generateJson = (prompt, schema) => {
  const provider = active();
  if (!provider) throw new Error('No generator configured');
  return provider.generateJson(prompt, schema);
};

module.exports = { generateJson, isAvailable, describe, PROVIDERS };
