// Which listings are eligible to answer a wanted post at all.
//
// Shared by every matcher on purpose. These rules are about correctness, not
// relevance: whether a listing is still up, whether it is the asker's own,
// whether it is inside a budget they stated. A matcher gets to decide which
// eligible listing is the best answer — it does not get to decide that a
// sold item or somebody's own listing is an answer. Duplicating this in each
// matcher is how the semantic one would quietly start recommending people
// their own bike six months from now.

// Scoring the whole board would not scale, and does not need to: newest
// first means the cap only ever bites on a busy board, where the newest
// listings are also the ones worth telling somebody about.
const CANDIDATE_CAP = 300;

/**
 * @param {object} wanted        a LookingFor document
 * @param {Date|null} since      only listings newer than this; null = all
 */
const candidateQuery = (wanted, since = null) => ({
  status: 'active',
  // Telling somebody their own listing answers their own wanted post is the
  // kind of thing that makes an alert feel broken.
  sellerId: { $ne: wanted.userId },
  ...(since ? { createdAt: { $gt: since } } : {}),
  // A budget is a stated constraint rather than a hint, so it filters. Free
  // items pass it too, which is the intent.
  ...(wanted.maxBudget ? { price: { $lte: wanted.maxBudget } } : {}),
});

module.exports = { candidateQuery, CANDIDATE_CAP };
