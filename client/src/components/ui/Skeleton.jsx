// Loading placeholder block with a shimmering sweep animation
export default function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  );
}
