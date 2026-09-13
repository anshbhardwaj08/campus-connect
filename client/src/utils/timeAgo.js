// Converts a timestamp into a relative "time ago" string, e.g. "2 hours ago"
export const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
  }

  return 'just now';
};

export default timeAgo;
