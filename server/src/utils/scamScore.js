const URGENT_KEYWORDS = [
  'urgent', 'hurry', 'asap', 'limited time', 'act now', 'first come',
  'cash only', 'no questions', 'leaving today', 'wire transfer', 'advance payment',
];

/**
 * Heuristic scam score (0-100). Flags suspiciously low prices for the category
 * and urgent/pressure language commonly used in scam listings.
 */
const calculateScamScore = ({ title = '', description = '', price = 0, categoryAvgPrice = null }) => {
  let score = 0;
  const text = `${title} ${description}`.toLowerCase();

  const urgentHits = URGENT_KEYWORDS.filter((kw) => text.includes(kw)).length;
  score += Math.min(urgentHits * 15, 45);

  if (categoryAvgPrice && categoryAvgPrice > 0) {
    const ratio = price / categoryAvgPrice;
    if (ratio < 0.2) score += 40;
    else if (ratio < 0.4) score += 20;
  }

  if (price === 0 && !text.includes('free')) score += 10;

  return Math.min(score, 100);
};

module.exports = calculateScamScore;
