// Which embedding provider the semantic matcher uses.
//
// The provider contract:
//
//   name         string, for logs
//   isAvailable()      -> boolean. False means "not configured", NOT an
//                         error — the matcher falls back to the keyword one
//   describe()         -> { name, model, dimensions }. `model` is prefixed
//                         with the provider, because a cached vector from
//                         one provider must never be compared against one
//                         from another: different spaces, and the cosine
//                         would look perfectly plausible while meaning
//                         nothing. vector.isFresh() checks this
//   embed(texts, { kind })
//                      -> Promise<number[][]>, one per input, in order.
//                         `kind` is 'query' or 'document'; a provider with
//                         no such distinction ignores it
//
// Selection is by which key is actually set, so there is nothing extra to
// configure: drop GEMINI_API_KEY in .env and the semantic matcher starts
// working. EMBEDDER forces one when both are present.
//
// Gemini first when both are set, because it is the free one and the
// difference in quality for this job does not justify a bill nobody asked
// for.

const { winstonLogger } = require('../middleware/logger');

const { describeRejection } = require('./embedders/keyShape');
const gemini = require('./embedders/gemini');
const openai = require('./embedders/openai');

const PROVIDERS = { gemini, openai };
const ORDER = ['gemini', 'openai'];

const active = () => {
  const forced = process.env.EMBEDDER;
  if (forced) return PROVIDERS[forced] || null;
  return ORDER.map((name) => PROVIDERS[name]).find((p) => p.isAvailable()) || null;
};

const isAvailable = () => Boolean(active()?.isAvailable());

const describe = () => active()?.describe() || { name: 'none', model: 'none', dimensions: 0 };

const embed = (texts, options) => {
  const provider = active();
  if (!provider) throw new Error('No embedding provider configured');
  return provider.embed(texts, options);
};

// Once per process, not once per wanted post: a board with thirty open
// requests would otherwise write thirty identical lines every hour.
//
// It says WHY, because the confusing case is having just pasted a key and
// still being told there is no provider. That happened for real: a valid
// 53-character Gemini key was rejected by a check expecting the older
// 39-character format, and the only clue was a silent fallback.
const warnUnavailableOnce = (() => {
  let warned = false;
  return () => {
    if (warned) return;
    warned = true;

    const reasons = [
      `GEMINI_API_KEY ${describeRejection(process.env.GEMINI_API_KEY, { minLength: 30 })}`,
      `OPENAI_API_KEY ${describeRejection(process.env.OPENAI_API_KEY, { minLength: 40, prefix: 'sk-' })}`,
    ];

    winstonLogger.warn(
      `Semantic matcher asked for, but no embedding provider is usable (${reasons.join('; ')}) ` +
        '— falling back to the keyword matcher'
    );
  };
})();

module.exports = { embed, isAvailable, describe, warnUnavailableOnce, PROVIDERS };
