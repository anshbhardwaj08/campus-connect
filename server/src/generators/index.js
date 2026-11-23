// The generation seam, built to match matchers/embedder.js.
//
// The contract a generator meets:
//
//   isAvailable()              -> boolean. False means "not configured",
//                                 never an error — the caller falls back
//   describe()                 -> { name, model }
//   generateJson(prompt, schema) -> Promise<parsed JSON>, or throws
//
// And one optional method:
//
//   describeImage(images, prompt, schema)
//                              -> Promise<parsed JSON>, or throws.
//                                 Omit it if the provider cannot see
//                                 pictures; `canSeeImages()` below reports
//                                 whether the active one can.
//
// Optional rather than required, and asked about rather than assumed, for a
// specific reason: a text-only provider handed an image it could not read
// would answer from the prompt alone and return a confident description of a
// photograph it never saw. A caption invented that way is worse than no
// caption — it would go into an embedding and quietly skew the matching. So
// the capability is a question the caller asks first.
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

const canSeeImages = () => typeof active()?.describeImage === 'function';

const describeImage = (images, prompt, schema) => {
  const provider = active();
  if (!provider) throw new Error('No generator configured');
  if (typeof provider.describeImage !== 'function') {
    throw new Error(`Generator ${provider.describe().name} cannot read images`);
  }
  return provider.describeImage(images, prompt, schema);
};

module.exports = { generateJson, describeImage, canSeeImages, isAvailable, describe, PROVIDERS };
