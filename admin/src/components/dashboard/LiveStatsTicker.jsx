// Today's numbers, moving as the marketplace moves.
//
// Purely a display: the figures are today's bucket of the activity series,
// which useLiveActivity keeps current over the socket. That seed matters —
// a socket only knows what happened after it connected, so a strip built
// from socket traffic alone would open every afternoon claiming nothing
// had happened all day.
//
// If the socket never connects the numbers are still right as of page
// load, and the label says "Today so far" rather than implying it is
// watching when it is not.

import { useEffect, useRef } from 'react';

import { gsap, stampIn } from '../../lib/motion';

const COUNTERS = [
  { key: 'listings', label: 'Listed' },
  { key: 'deals', label: 'Closed' },
  { key: 'reports', label: 'Reported' },
  { key: 'users', label: 'Joined' },
];

export default function LiveStatsTicker({ today, live = false }) {
  const ref = useRef(null);
  const previous = useRef(null);

  // Stamp only the figure that actually moved, so the eye is sent to the
  // thing that changed rather than to the whole strip reprinting itself.
  useEffect(() => {
    if (!today || !ref.current) return undefined;

    const before = previous.current;
    previous.current = today;
    if (!before) return undefined;

    const changed = COUNTERS.filter((c) => (today[c.key] ?? 0) > (before[c.key] ?? 0));
    if (!changed.length) return undefined;

    const ctx = gsap.context(() => {
      changed.forEach((c) => stampIn(`[data-counter="${c.key}"]`));
    }, ref);
    return () => ctx.revert();
  }, [today]);

  return (
    <div
      ref={ref}
      className="flex flex-wrap items-center gap-x-7 gap-y-2 border-[3px] border-ink bg-ink px-4 py-2.5 shadow-hard"
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 ${live ? 'bg-crimson' : 'bg-steel'}`}
          style={live ? { animation: 'breathe 1.6s ease-in-out infinite' } : undefined}
          aria-hidden="true"
        />
        <span className="font-sans text-[10.5px] font-extrabold uppercase tracking-[.09em] text-paper-3">
          {live ? 'Live today' : 'Today so far'}
        </span>
      </span>

      {COUNTERS.map((c) => (
        <span key={c.key} className="flex items-baseline gap-2">
          <span data-counter={c.key} className="font-display text-[22px] leading-none text-paper-3">
            {today?.[c.key] ?? 0}
          </span>
          <span className="font-sans text-[10.5px] font-extrabold uppercase tracking-[.09em] text-ice">
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}
