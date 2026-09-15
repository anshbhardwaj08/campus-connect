// What other students said after a deal closed. This is the part of a
// profile a buyer actually reads before agreeing to meet someone.
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import StarRating from '../ui/StarRating';
import Skeleton from '../ui/Skeleton';
import { timeAgo } from '../../utils/timeAgo';

export default function ReviewList({ reviews = [], loading = false, emptyText }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <p className="meta border-l-[3px] border-ink/20 pl-3 leading-relaxed">
        {emptyText || 'No reviews yet. They come in after a deal closes.'}
      </p>
    );
  }

  const average = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 border-b-2 border-ink/10 pb-3">
        <span className="font-display text-[30px] leading-none text-ink">{average.toFixed(1)}</span>
        <div>
          <StarRating rating={Math.round(average)} size="sm" />
          <p className="meta mt-0.5">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {reviews.map((review) => (
        <article key={review._id} className="border-b-2 border-ink/10 pb-3 last:border-b-0 last:pb-0">
          <div className="flex items-start gap-2.5">
            <Avatar name={review.reviewerId?.name} src={review.reviewerId?.avatar} size="sm" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-extrabold text-ink">
                  {review.reviewerId?.name || 'A student'}
                </span>
                {review.type && <Badge tone="outline">as {review.type}</Badge>}
                <span className="meta ml-auto">{timeAgo(review.createdAt)}</span>
              </div>

              <StarRating rating={review.rating} size="sm" className="mt-1" />

              {review.comment && (
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink">
                  {review.comment}
                </p>
              )}

              {review.listingId?.title && (
                <p className="meta mt-1">on {review.listingId.title}</p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
