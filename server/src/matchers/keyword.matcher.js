// Matching by vocabulary: the first implementation behind the seam in
// ./index.js. See that file for what a matcher has to do; see
// ./vocabulary.js for why the synonym list is hand-written.

const Listing = require('../models/Listing');
const { conceptsOf } = require('./vocabulary');
const { candidateQuery, CANDIDATE_CAP } = require('./candidates');

// A score is 85% "how much of what you asked for is in this listing" and 15%
// "is it filed where you would have looked".
//
// Category is weak evidence, not proof, so it cannot be a filter: a real
// wanted post on this deployment asks for a "calculator" and is filed under
// `books`, while any calculator listing would sit in `electronics` or
// `stationery`. Filtering on it would throw that match away, and
// miscategorised posts are the norm here rather than the exception.
//
// It is blended rather than added because adding it did nothing. A one-word
// request matched exactly already scores 1.0, so a boost on top was clipped
// off by the cap and two listings that differed only by category came out
// identical. Blending leaves room above every score for the category to
// matter.
const CATEGORY_WEIGHT = 0.15;

// What clears the bar: about a third of what was asked for. Wanted posts are
// short — "need a calculator" is one concept, "physics textbook" is two — so
// one shared concept out of three passes on its own, and one out of four
// only passes if the category agrees too.
const THRESHOLD = 0.25;

/**
 * Listings that answer a wanted post, best first.
 *
 * @param {object} wanted           a LookingFor document
 * @param {Date|null} opts.since    only listings newer than this. null means
 *                                  the whole board — see the service for why
 *                                  the first run is deliberately unbounded.
 * @param {number} opts.limit       how many to return
 * @returns {Promise<Array<{ listing, score, shared: string[] }>>}
 */
const findMatches = async (wanted, { since = null, limit = 5 } = {}) => {
  const asked = conceptsOf(wanted.title, wanted.description);
  // Nothing was asked for in any usable way ("dbjs", or a title of pure
  // stopwords). Matching everything would be worse than matching nothing.
  if (asked.size === 0) return [];

  const candidates = await Listing.find(candidateQuery(wanted, since))
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_CAP)
    .lean();

  return candidates
    .map((listing) => {
      const offered = conceptsOf(listing.title, listing.description);
      const shared = [...asked].filter((concept) => offered.has(concept));

      // Share of what was ASKED for, not of what was offered: a long
      // description should not dilute a listing that plainly has the thing.
      const covered = shared.length / asked.size;
      const sameCategory = Boolean(wanted.category) && listing.category === wanted.category;
      const score = covered * (1 - CATEGORY_WEIGHT) + (sameCategory ? CATEGORY_WEIGHT : 0);

      return { listing, score, shared };
    })
    .filter((m) => m.shared.length > 0 && m.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

module.exports = { name: 'keyword', findMatches, THRESHOLD };
