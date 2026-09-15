// A single stat, printed like a price slab: Bangers number, steel label
// above it. Flat ink border, no radius, no icon doing the emphasis — the
// number is the whole point.
import Skeleton from '../ui/Skeleton';

export default function KPICard({ label, value, loading, tone = 'paper' }) {
  const TONE = {
    paper: 'bg-paper-3 text-ink',
    crimson: 'bg-crimson text-paper-3',
  };

  if (loading) {
    return <Skeleton className="h-[92px] border-[3px]" />;
  }

  return (
    <div className={`border-[3px] border-ink px-4 py-3.5 shadow-hard ${TONE[tone]}`}>
      <p className="label-xs !text-current opacity-70">{label}</p>
      <p className="mt-1 font-display text-[34px] leading-none tracking-[.01em]">{value}</p>
    </div>
  );
}
