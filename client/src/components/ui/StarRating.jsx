// Star rating display (read-only) or interactive input (1-5) used in reviews
import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, onChange, size = 18 }) {
  const interactive = typeof onChange === 'function';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(value)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={size}
            className={value <= rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-zinc-300 dark:text-zinc-600'}
          />
        </button>
      ))}
    </div>
  );
}
