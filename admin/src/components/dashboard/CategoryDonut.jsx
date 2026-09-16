// What is actually on sale right now, split by category.
//
// The theme has exactly one accent, so slices cannot be told apart by hue
// the way a normal donut does it. They are told apart the way a printed
// comic does it: solid plates from the palette for the big slices, then
// halftone screens for the tail. Reading order runs largest to smallest,
// and the legend carries the numbers so nothing depends on colour alone.

import { useLayoutEffect, useMemo, useRef } from 'react';

import { gsap, stampIn, WIPE_DURATION } from '../../lib/motion';
import Panel from '../ui/Panel';
import Skeleton from '../ui/Skeleton';

const SIZE = 220;
const C = SIZE / 2;
const R_OUTER = 96;
const R_INNER = 58;

const MAX_SLICES = 6;

// Solid plates first, then screens. All eight tokens, no new colour.
const PLATES = [
  '#C0353A',
  '#0B0D11',
  '#1B2536',
  '#5A6B80',
  '#AFC4D8',
  'url(#cd-screen-coarse)',
  'url(#cd-screen-fine)',
];

const polar = (r, angle) => [C + r * Math.cos(angle), C + r * Math.sin(angle)];

const arcPath = (start, end) => {
  const largeArc = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = polar(R_OUTER, start);
  const [x2, y2] = polar(R_OUTER, end);
  const [x3, y3] = polar(R_INNER, end);
  const [x4, y4] = polar(R_INNER, start);
  return [
    `M${x1},${y1}`,
    `A${R_OUTER},${R_OUTER} 0 ${largeArc} 1 ${x2},${y2}`,
    `L${x3},${y3}`,
    `A${R_INNER},${R_INNER} 0 ${largeArc} 0 ${x4},${y4}`,
    'Z',
  ].join(' ');
};

export default function CategoryDonut({ data = [], loading }) {
  const ref = useRef(null);

  const { slices, total } = useMemo(() => {
    const sum = data.reduce((acc, d) => acc + d.count, 0);
    if (!sum) return { slices: [], total: 0 };

    const head = data.slice(0, MAX_SLICES);
    const tail = data.slice(MAX_SLICES);
    const rows = [...head];
    if (tail.length) {
      rows.push({
        slug: '__other',
        name: `${tail.length} more`,
        count: tail.reduce((acc, d) => acc + d.count, 0),
      });
    }

    let angle = -Math.PI / 2;
    const built = rows.map((row, i) => {
      const sweep = (row.count / sum) * Math.PI * 2;
      const slice = { ...row, fill: PLATES[i % PLATES.length], start: angle, end: angle + sweep };
      angle += sweep;
      return slice;
    });

    return { slices: built, total: sum };
  }, [data]);

  useLayoutEffect(() => {
    if (!ref.current || !slices.length) return;
    const ctx = gsap.context(() => {
      stampIn('.js-total', { delay: WIPE_DURATION });
    }, ref);
    return () => ctx.revert();
  }, [slices]);

  return (
    <Panel index={2} className="min-w-0">
      <span className="label-xs">On sale now</span>
      <p className="mt-1 font-sans text-[15px] font-extrabold leading-tight text-ink">
        Active listings by category
      </p>

      {loading ? (
        <Skeleton className="mt-4 h-[230px] border-2" />
      ) : !slices.length ? (
        <p className="meta mt-4 leading-relaxed">
          Nothing is on sale at the moment, so there is nothing to divide up.
        </p>
      ) : (
        <div ref={ref} className="mt-3 flex flex-wrap items-center gap-5">
          <div className="relative shrink-0">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              width={SIZE}
              height={SIZE}
              role="img"
              aria-label={`${total} active listings across ${data.length} categories`}
            >
              <defs>
                <pattern id="cd-screen-coarse" width="7" height="7" patternUnits="userSpaceOnUse">
                  <rect width="7" height="7" fill="#F2EFE7" />
                  <circle cx="3.5" cy="3.5" r="1.9" fill="#0B0D11" opacity="0.5" />
                </pattern>
                <pattern id="cd-screen-fine" width="3.6" height="3.6" patternUnits="userSpaceOnUse">
                  <rect width="3.6" height="3.6" fill="#F2EFE7" />
                  <circle cx="1.8" cy="1.8" r="0.9" fill="#0B0D11" opacity="0.45" />
                </pattern>
              </defs>

              {/* One category holding everything would ask for a 360° arc,
                  which a single A command cannot draw — it collapses to
                  nothing. A full ring is two circles instead. */}
              {slices.length === 1 ? (
                <>
                  <circle cx={C} cy={C} r={R_OUTER} fill={slices[0].fill} />
                  <circle
                    cx={C}
                    cy={C}
                    r={R_OUTER}
                    fill="none"
                    stroke="#0B0D11"
                    strokeWidth="3"
                  />
                  <circle cx={C} cy={C} r={R_INNER} fill="#F2EFE7" stroke="#0B0D11" strokeWidth="3" />
                </>
              ) : (
                slices.map((s) => (
                  <path
                    key={s.slug}
                    d={arcPath(s.start, s.end)}
                    fill={s.fill}
                    stroke="#0B0D11"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                ))
              )}
            </svg>

            <div className="js-total pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[34px] leading-none text-ink">{total}</span>
              <span className="label-xs mt-0.5">live</span>
            </div>
          </div>

          <ul className="flex min-w-[150px] flex-1 flex-col gap-1.5">
            {slices.map((s) => (
              <li key={s.slug} className="flex items-center gap-2.5">
                {/* The swatch takes the slice's own fill, pattern included,
                    so the two can never drift apart. A CSS approximation of
                    the halftone read as a blank white square at this size. */}
                <svg width="16" height="16" className="shrink-0" aria-hidden="true">
                  <rect
                    x="1.5"
                    y="1.5"
                    width="13"
                    height="13"
                    fill={s.fill}
                    stroke="#0B0D11"
                    strokeWidth="3"
                  />
                </svg>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">
                  {s.name}
                </span>
                <span className="shrink-0 text-[12.5px] font-extrabold tabular-nums text-ink">
                  {s.count}
                </span>
                <span className="meta shrink-0 w-9 text-right tabular-nums">
                  {Math.round((s.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
