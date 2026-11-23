// Which listings are eligible to answer a wanted post at all.
//
// Shared by every matcher on purpose. These rules are about correctness, not
// relevance: whether a listing is still up, whether it is the asker's own,
// whether it is for sale or for hire, whether it is inside a budget they
// stated. A matcher gets to decide which eligible listing is the best answer
// — it does not get to decide that a sold item or somebody's own listing is
// an answer. Duplicating this in each matcher is how the semantic one would
// quietly start recommending people their own bike six months from now.

// Scoring the whole board would not scale, and does not need to: newest
// first means the cap only ever bites on a busy board, where the newest
// listings are also the ones worth telling somebody about.
const CANDIDATE_CAP = 300;

// A rent listing's `price` is a rate per `rentPeriod`, so two rentals are
// only comparable once both are expressed in the same unit. A month is 30
// days here rather than a calendar month — the arithmetic exists to make
// budgets comparable, not to bill anyone.
const PERIOD_DAYS = { day: 1, week: 7, month: 30 };

/**
 * The price half of eligibility.
 *
 * A budget is a stated constraint rather than a hint, so it filters. Free
 * items pass it too, which is the intent.
 *
 * For a sale that is one comparison. For a rental it cannot be: somebody who
 * says "₹150 a day" should see a cycle at ₹900 a week (₹128 a day) and not
 * one at ₹1,400 a week (₹200 a day), and a raw `price <= 150` would get both
 * of those backwards. So the budget is converted to a daily rate and every
 * period is compared in those terms.
 */
const budgetFilter = (wanted) => {
  if (!wanted.maxBudget) return {};

  if (wanted.listingType !== 'rent') return { price: { $lte: wanted.maxBudget } };

  // A rental want that never said per what. The number is real but its unit
  // is unknown, and a wrong unit is off by a factor of thirty — so the type
  // filter still applies and this one does not. Over-showing beats silently
  // hiding everything affordable.
  const days = PERIOD_DAYS[wanted.rentPeriod];
  if (!days) return {};

  const perDay = wanted.maxBudget / days;

  return {
    $or: [
      ...Object.entries(PERIOD_DAYS).map(([period, span]) => ({
        rentPeriod: period,
        price: { $lte: perDay * span },
      })),
      // `rentPeriod` is not required on a Listing, so a rate with no unit can
      // exist. Compared at face value, which is the conservative reading:
      // treating an unknown rate as monthly would let a ₹3,000 want through
      // on a ₹100-a-day hire.
      { rentPeriod: null, price: { $lte: wanted.maxBudget } },
    ],
  };
};

/**
 * @param {object} wanted        a LookingFor document
 * @param {Date|null} since      only listings newer than this; null = all
 */
const candidateQuery = (wanted, since = null) => ({
  status: 'active',
  // Telling somebody their own listing answers their own wanted post is the
  // kind of thing that makes an alert feel broken.
  sellerId: { $ne: wanted.userId },
  // Someone wanting to borrow a drafter for one afternoon is not answered by
  // a drafter for sale, at any price. This is a filter and not a ranking
  // signal because it is not a matter of degree — it is the wrong question.
  //
  // Falls back to 'sale' so that a post written before the field existed,
  // or one read through `.lean()` (which skips Mongoose defaults), behaves
  // the way it did before rather than matching nothing.
  listingType: wanted.listingType || 'sale',
  ...(since ? { createdAt: { $gt: since } } : {}),
  ...budgetFilter(wanted),
});

module.exports = { candidateQuery, CANDIDATE_CAP, PERIOD_DAYS };
