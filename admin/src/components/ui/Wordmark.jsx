// COLLEGE OLX. Identical to client/src/components/ui/Wordmark.jsx — see
// there for the reasoning. `to` defaults to admin's own home ("/").
import { Link } from 'react-router-dom';

const SIZES = {
  sm: { word: 'text-[22px]', slab: 'text-[22px] px-1.5 pb-0.5 pt-1', gap: 'gap-1.5', off: 2 },
  md: { word: 'text-[32px]', slab: 'text-[32px] px-2 pb-1 pt-1.5', gap: 'gap-2', off: 3 },
  lg: { word: 'text-[46px]', slab: 'text-[46px] px-3 pb-1.5 pt-2', gap: 'gap-2.5', off: 4 },
};

export default function Wordmark({ size = 'md', tone = 'ink', to = '/', className = '' }) {
  const s = SIZES[size];
  const onDark = tone === 'paper';

  const mark = (
    <span
      className={`group/mark inline-flex items-center ${s.gap} font-display leading-none tracking-[.02em] ${className}`}
    >
      <span
        className={`${s.word} ${onDark ? 'text-paper-3' : 'text-ink'} transition-[text-shadow] duration-100 group-hover/mark:[text-shadow:none]`}
        style={{ textShadow: `${s.off}px ${s.off}px 0 var(--crimson)` }}
      >
        COLLEGE
      </span>

      <span
        className={`inline-block -rotate-2 border-[3px] border-ink bg-crimson text-paper-3 shadow-hard-sm transition-transform duration-100 group-hover/mark:rotate-0 group-active/mark:translate-x-[3px] group-active/mark:translate-y-[3px] group-active/mark:shadow-none ${s.slab}`}
      >
        OLX
      </span>
    </span>
  );

  if (!to) return mark;

  return (
    <Link to={to} className="inline-flex items-center" aria-label="College OLX — home">
      {mark}
    </Link>
  );
}
