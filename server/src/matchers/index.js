// The seam.
//
// Everything that wants to know "which listings answer this wanted post?"
// asks here and nowhere else. Nothing outside this folder knows how the
// answer is worked out, which is the entire point: swapping vocabulary
// matching for embeddings has to be a change to this folder and a config
// value, not a change to the service, the job, the notification or the tests
// that cover them.
//
// The contract a matcher has to meet:
//
//   name      string, for logs
//   findMatches(wanted, { since, limit })
//             -> Promise<Array<{ listing, score: 0..1, shared: string[] }>>
//             best first, already filtered to what is worth notifying about
//
// `findMatches` is async even though the keyword matcher has nothing to
// await. That is on purpose — a semantic matcher will do a vector lookup,
// and if the seam were synchronous today every caller would have to change
// the day it is swapped in.
//
// Two exist:
//
//   keyword   a hand-written campus vocabulary. Free, instant, no external
//             dependency, and cannot match a phrasing nobody thought of.
//   semantic  embeddings. Handles phrasings nobody thought of; needs an
//             embedding provider, and falls back to `keyword` by itself when
//             there is not one or the provider fails.
//
// `keyword` is still the default. Switch with WANTED_MATCHER=semantic once
// OPENAI_API_KEY holds a real key — and switch on the strength of
// `npm run match:compare`, which runs both over the same board and prints
// what each one found. "Vectors are better" is an assertion; two columns of
// matches is evidence.

const keyword = require('./keyword.matcher');
const semantic = require('./semantic.matcher');

const MATCHERS = {
  keyword,
  semantic,
};

const DEFAULT = 'keyword';

const active = () => MATCHERS[process.env.WANTED_MATCHER] || MATCHERS[DEFAULT];

const findMatches = (wanted, options) => active().findMatches(wanted, options);

const activeName = () => active().name;

module.exports = { findMatches, activeName, MATCHERS };
