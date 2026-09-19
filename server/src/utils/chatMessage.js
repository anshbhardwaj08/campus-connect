// What a chat message is allowed to be, shared by the socket handler and the
// REST fallback so the two cannot drift. Offers are not accepted here: they
// carry an amount and have their own path (`chat:offer`), and letting a
// plain message claim `type: 'offer'` would put an offer card with no amount
// in front of the seller.
const MAX_TEXT = 2000;

const parseMessage = ({ text, imageUrl, type = 'text' } = {}) => {
  if (type === 'text') {
    const body = typeof text === 'string' ? text.trim() : '';
    if (!body) return { error: 'A message cannot be empty' };
    if (body.length > MAX_TEXT) return { error: `Keep a message under ${MAX_TEXT} characters` };
    return { value: { type, text: body } };
  }

  if (type === 'image') {
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('https://')) {
      return { error: 'An image needs an https link' };
    }
    return { value: { type, imageUrl } };
  }

  return { error: 'Unknown message type' };
};

// A whole number of rupees, zero or more. Anything else — a string, NaN,
// Infinity, a negative — is not an offer anyone can accept.
const parseOfferAmount = (amount) => {
  // Only a number or a numeric string. Number() alone turns null, '' and
  // false into 0 — a free offer nobody made.
  const numeric =
    typeof amount === 'number' || (typeof amount === 'string' && /^\d+(\.\d+)?$/.test(amount.trim()));
  const n = numeric ? Number(amount) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 10000000) {
    return { error: 'An offer has to be an amount in rupees' };
  }
  return { value: Math.round(n) };
};

module.exports = { parseMessage, parseOfferAmount, MAX_TEXT };
