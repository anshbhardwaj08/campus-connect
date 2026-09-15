// The grid frame for pending listings: loading skeletons, an empty state,
// and the grid itself. Mirrors client's CommunityShell split — page fetches
// and mutates, this just lays the results out.
import Skeleton from '../ui/Skeleton';

export default function PendingQueue({ isLoading, isEmpty, children }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="border-2 border-dashed border-ink/25 px-4 py-14 text-center">
        <p className="text-[14px] font-extrabold text-ink">Nothing pending.</p>
        <p className="meta mx-auto mt-1.5 max-w-xs leading-relaxed">
          Every listing that a scam-score check flagged has been approved or
          rejected. New ones will show up here as they are posted.
        </p>
      </div>
    );
  }

  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
