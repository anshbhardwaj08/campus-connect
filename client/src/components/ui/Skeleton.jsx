// Loading placeholder: a flat halftone block, no radius, no shimmer sweep.
// A gradient sweep is exactly the kind of thing this system does not do —
// the block just sits there at a low opacity until the content arrives.

export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`screen-coarse border-2 border-ink/25 bg-paper-2/60 ${className}`}
      style={{ animation: 'breathe 1.6s ease-in-out infinite' }}
      aria-hidden="true"
    />
  );
}
