// Dates on this page are always about turning up somewhere: an event, a
// ride, the day something was lost. So they lead with the day, not the year.

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// "In 3 days" reads better than a date when something is imminent, and a
// past date needs to say so plainly rather than looking like it is upcoming.
export const whenRelative = (value) => {
  if (!value) return '';
  const days = Math.round((new Date(value) - Date.now()) / 86400000);
  if (Number.isNaN(days)) return '';
  if (days < 0) return 'Already gone';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 14) return `In ${days} days`;
  return '';
};

export default formatDate;
