// Thirty days of marketplace activity, drawn as inked lines on newsprint.
//
// Hand-rolled SVG rather than a chart library. Recharts ships in
// package.json and the original stub used it, but every default it has —
// its own palette, its own rounded tooltips, its own animation engine —
// is something this system forbids, so it would have been overridden at
// every turn. It also weighs more than the whole rest of the dashboard,
// and /admin's bundle is already over the warning line. A line chart is a
// polyline through scaled points; that is cheaper to write than to fight.
//
// Supply (listings posted) is the ink line with a halftone fill beneath it.
// Demand closing (deals completed) is the crimson line — the one accent in
// this panel.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { gsap, drawIn, WIPE_DURATION } from '../../lib/motion';
import Panel from '../ui/Panel';
import Skeleton from '../ui/Skeleton';

const VW = 720;
const VH = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 44 };
const PLOT_W = VW - PAD.left - PAD.right;
const PLOT_H = VH - PAD.top - PAD.bottom;

const RANGES = [7, 30, 90];

// 'YYYY-MM-DD' built as a local date. new Date('2026-09-16') would parse as
// UTC midnight and render as the 15th anywhere west of Greenwich.
const parseDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const shortDay = (key) =>
  parseDay(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const longDay = (key) =>
  parseDay(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

// A ceiling on a round number, so the gridlines land on values a person
// would actually say out loud. Never zero — a flat, empty week still needs
// an axis to sit against.
const niceMax = (value) => {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (pow / 2)) * (pow / 2);
};

export default function ActivityChart({ series = [], days, onRangeChange, loading }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const { max, pointsFor, areaFor, x } = useMemo(() => {
    const peak = series.reduce((m, d) => Math.max(m, d.listings, d.deals), 0);
    const top = niceMax(peak);
    const n = series.length;

    // A single day would divide by zero below; park it in the middle.
    const xAt = (i) => (n < 2 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W);
    const yAt = (v) => PAD.top + PLOT_H - (v / top) * PLOT_H;

    const points = (key) => series.map((d, i) => `${xAt(i)},${yAt(d[key])}`).join(' ');

    const area = (key) => {
      if (!n) return '';
      const base = PAD.top + PLOT_H;
      const line = series.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(d[key])}`).join('');
      return `${line}L${xAt(n - 1)},${base}L${xAt(0)},${base}Z`;
    };

    return { max: top, pointsFor: points, areaFor: area, x: xAt };
  }, [series]);

  // Draw on first paint and whenever the range changes, but never on a
  // background refetch. Re-running the draw hides the line for the length
  // of its delay, so a quiet refresh would blink it off for no reason —
  // and a live tick refreshes this data every time something is posted.
  const drawnFor = useRef(null);

  useLayoutEffect(() => {
    if (!svgRef.current || !series.length || drawnFor.current === days) return undefined;
    drawnFor.current = days;
    const ctx = gsap.context(() => {
      drawIn('.js-plot', { delay: WIPE_DURATION });
    }, svgRef);
    return () => ctx.revert();
  }, [series, days]);

  const readPointer = (event) => {
    if (!series.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    // The SVG scales to its container, so the pointer has to be mapped back
    // into viewBox units before it means anything.
    const vx = ((event.clientX - box.left) / box.width) * VW;
    const ratio = (vx - PAD.left) / PLOT_W;
    const i = Math.round(ratio * (series.length - 1));
    setHover(Math.min(Math.max(i, 0), series.length - 1));
  };

  const point = hover === null ? null : series[hover];
  const gridlines = [0, 0.25, 0.5, 0.75, 1];
  // Enough labels to orient, never so many they collide at 7 days or 90.
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <Panel index={1} className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="label-xs">Activity</span>
          <p className="mt-1 font-sans text-[15px] font-extrabold leading-tight text-ink">
            Listings posted and deals closed
          </p>
        </div>

        <div className="flex border-2 border-ink">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`min-h-[30px] px-2.5 font-sans text-[11px] font-extrabold uppercase tracking-[.06em] transition-colors ${
                days === r ? 'bg-ink text-paper-3' : 'bg-paper-3 text-ink hover:bg-paper-2'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-[230px] border-2" />
      ) : (
        <div className="relative mt-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            className="block w-full"
            role="img"
            aria-label={`Listings posted and deals completed over the last ${days} days`}
            onMouseMove={readPointer}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {/* 7px screen — the coarse plate, same as .screen-coarse */}
              <pattern id="ac-screen" width="7" height="7" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill="#F2EFE7" />
                <circle cx="3.5" cy="3.5" r="1.6" fill="#0B0D11" opacity="0.26" />
              </pattern>
            </defs>

            <rect
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="#F2EFE7"
              stroke="#0B0D11"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {gridlines.map((g) => {
              const y = PAD.top + PLOT_H - g * PLOT_H;
              return (
                <g key={g}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={PAD.left + PLOT_W}
                    y2={y}
                    stroke="#0B0D11"
                    strokeWidth="1"
                    opacity={g === 0 ? 0 : 0.13}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={PAD.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-steel font-sans text-[11px] font-bold"
                  >
                    {Math.round(g * max)}
                  </text>
                </g>
              );
            })}

            {series.length > 0 && (
              <>
                <path d={areaFor('listings')} fill="url(#ac-screen)" opacity="0.85" />

                <polyline
                  className="js-plot"
                  pathLength="1"
                  strokeDasharray="1"
                  points={pointsFor('listings')}
                  fill="none"
                  stroke="#0B0D11"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  className="js-plot"
                  pathLength="1"
                  strokeDasharray="1"
                  points={pointsFor('deals')}
                  fill="none"
                  stroke="#C0353A"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}

            {series.map((d, i) =>
              i % labelEvery === 0 || i === series.length - 1 ? (
                <text
                  key={d.date}
                  x={x(i)}
                  y={VH - 9}
                  // The end labels sit on the plot edges, so centring them
                  // hangs half the date off the side of the chart.
                  textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
                  className="fill-steel font-sans text-[11px] font-bold"
                >
                  {shortDay(d.date)}
                </text>
              ) : null
            )}

            {point && (
              <g>
                <line
                  x1={x(hover)}
                  y1={PAD.top}
                  x2={x(hover)}
                  y2={PAD.top + PLOT_H}
                  stroke="#0B0D11"
                  strokeWidth="1.5"
                  opacity="0.45"
                  vectorEffect="non-scaling-stroke"
                />
                {['listings', 'deals'].map((key) => (
                  <rect
                    key={key}
                    x={x(hover) - 4}
                    y={PAD.top + PLOT_H - (point[key] / max) * PLOT_H - 4}
                    width="8"
                    height="8"
                    fill={key === 'deals' ? '#C0353A' : '#0B0D11'}
                    stroke="#F2EFE7"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Readout as HTML, not SVG text: it inherits the same type scale
              as every other caption in the product for free. */}
          {point && (
            <div
              className="pointer-events-none absolute top-1 border-2 border-ink bg-paper-2 px-2.5 py-1.5"
              style={{
                left: `${(x(hover) / VW) * 100}%`,
                transform: hover > series.length / 2 ? 'translateX(-108%)' : 'translateX(8%)',
              }}
            >
              <p className="label-xs">{longDay(point.date)}</p>
              <p className="mt-0.5 text-[12px] font-extrabold leading-tight text-ink">
                {point.listings} listed
              </p>
              <p className="text-[12px] font-extrabold leading-tight text-crimson">
                {point.deals} closed
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="flex items-center gap-2 text-[11.5px] font-bold text-ink">
          <span className="h-[3px] w-5 bg-ink" /> Listings posted
        </span>
        <span className="flex items-center gap-2 text-[11.5px] font-bold text-ink">
          <span className="h-[3px] w-5 bg-crimson" /> Deals closed
        </span>
      </div>
    </Panel>
  );
}
