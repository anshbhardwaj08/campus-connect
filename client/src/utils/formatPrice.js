// Formats a number as Indian Rupee currency, e.g. 150000 -> "₹1,50,000"
export const formatPrice = (amount) => {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default formatPrice;
