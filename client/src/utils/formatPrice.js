// Formats a number as Indian Rupee currency, e.g. 150000 -> "₹1,50,000"
export const formatPrice = (amount) => {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const PERIOD_LABEL = { day: 'day', week: 'week', month: 'month' };

// A rental's price is a rate, and a rate without its period is a lie — the
// same 200 means very different things per day and per month. One helper so
// the slab, the card and the detail page can never word it differently.
//
// A free item stays "Free": "Free / day" reads as nonsense, and lending
// something for nothing has no rate to state.
export const formatRate = (amount, period) => {
  if (!amount || Number(amount) === 0) return formatPrice(0);
  const base = formatPrice(amount);
  return period ? `${base} / ${PERIOD_LABEL[period] || period}` : base;
};

export default formatPrice;
