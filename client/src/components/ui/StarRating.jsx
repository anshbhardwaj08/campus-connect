// Star rating, read-only by default or interactive when given onChange.
//
// Filled stars are ink, not amber — a rating is information, not an action,
// and amber would be a second accent the system does not have. Empty stars
// keep their outline so the score reads by shape as well as by fill.
import { Star } from 'lucide-react';

const SIZES = { sm: 14, md: 18, lg: 24 };

export default function StarRating({ rating = 0, onChange, size = 'md', className = '' }) {
  const interactive = typeof onChange === 'function';
  const px = SIZES[size] || SIZES.md;

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Choose a rating' : `${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating;
        const star = (
          <Star
            size={px}
            strokeWidth={2.25}
            className={filled ? 'fill-ink text-ink' : 'fill-transparent text-ink/30'}
          />
        );

        if (!interactive) return <span key={value}>{star}</span>;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
            onClick={() => onChange(value)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
