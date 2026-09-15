// The splash side of every auth screen.
//
// One idea drives all of the motion here: THE PAGE IS BEING PRINTED.
// Nothing floats or bounces for decoration. Every moving part is something a
// printing press does badly —
//
//   * two halftone plates drift out of register against each other
//   * the press light rakes across the sheet
//   * crimson impact lines strike in from the right
//   * the Bangers lettering is dragged onto the sheet, line by line
//   * the caption box lands like a rubber stamp
//
// Ambient motion is slow and low-amplitude on purpose. It should read as a
// sheet that has not quite settled, never as a UI animation.
//
// All of it is GSAP, all of it is scoped to a gsap.context so it reverts
// cleanly on unmount, and all of it collapses to the final frame under
// prefers-reduced-motion.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bike, BookOpen, Lamp, Calculator } from 'lucide-react';

import { gsap, prefersReducedMotion, EASE, HIDDEN, SHOWN } from '../../lib/motion';
import CaptionBox from '../ui/CaptionBox';

// Impact lines. Thickness and length vary so they read as struck, not ruled.
const STREAKS = [
  { w: '62%', h: 5, o: 0.9 },
  { w: '38%', h: 3, o: 0.55 },
  { w: '78%', h: 8, o: 1 },
  { w: '28%', h: 3, o: 0.4 },
  { w: '52%', h: 4, o: 0.7 },
];

// The montage: things that actually change hands when a hostel clears out.
const DEFAULT_ITEMS = [
  { icon: Bike, price: '₹2,100', rot: -3, cls: 'right-[7%] top-[11%] w-[132px]' },
  { icon: BookOpen, price: 'FREE', free: true, rot: 4, cls: 'right-[30%] top-[30%] w-[112px]' },
  { icon: Lamp, price: '₹340', rot: -6, cls: 'right-[11%] top-[44%] w-[104px]' },
  { icon: Calculator, price: '₹800', rot: 3, cls: 'right-[34%] top-[8%] w-[96px]' },
];

export default function AuthSplash({
  caption,
  headline = [], // array of lines; wrap a phrase in <em> for crimson
  blurb,
  narration = [], // rotating third-person captions along the bottom
  items = DEFAULT_ITEMS,
  tone = 'night', // 'night' | 'crimson'
  className = '',
}) {
  const root = useRef(null);
  const [beat, setBeat] = useState(0);
  const reduced = prefersReducedMotion();
  const isCrimson = tone === 'crimson';

  // --- Intro timeline + ambient loops ------------------------------------
  useLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      const q = self.selector;

      if (reduced) {
        gsap.set(q('.js-splash'), { clipPath: SHOWN });
        gsap.set(
          [q('.js-line'), q('.js-blurb'), q('.js-narration'), q('.js-caption'), q('.js-item')],
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            skewX: 0,
            clipPath: SHOWN,
          }
        );
        gsap.set(q('.js-streak'), { scaleX: 1 });
        gsap.set(q('.js-plate'), { opacity: 1, scale: 1 });
        return;
      }

      // Positions are absolute seconds, not relative offsets, because the
      // one thing that must not drift is how soon the copy becomes readable.
      // The headline starts at 0.28s and has fully landed by ~0.85s; the
      // blurb is in by ~1.0s. Everything decorative is scheduled around that,
      // never in front of it.
      const tl = gsap.timeline({ defaults: { ease: EASE } });

      // 1. The sheet goes through.
      tl.fromTo(q('.js-splash'), { clipPath: HIDDEN }, { clipPath: SHOWN, duration: 0.45 }, 0);

      // 2. The plates register — dots resolve from oversized and soft. This
      //    runs long and underneath; it must not gate the copy.
      tl.fromTo(
        q('.js-plate'),
        { opacity: 0, scale: 1.2 },
        { opacity: 1, scale: 1, duration: 0.9, stagger: 0.1 },
        0.12
      );

      // 3. Impact lines strike in from the right.
      tl.fromTo(
        q('.js-streak'),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.34, stagger: 0.045, ease: 'power4.out' },
        0.34
      );

      // 4. The lettering is dragged onto the sheet.
      tl.fromTo(
        q('.js-line'),
        { x: -34, skewX: 8, opacity: 0, clipPath: HIDDEN },
        {
          x: 0,
          skewX: 0,
          opacity: 1,
          clipPath: SHOWN,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power4.out',
        },
        0.28
      );

      // 5. The headline settles.
      tl.fromTo(q('.js-hit'), { scale: 1.07 }, { scale: 1, duration: 0.36, ease: 'back.out(3)' }, 0.6);

      tl.fromTo(q('.js-blurb'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.38 }, 0.6);

      tl.fromTo(q('.js-narration'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.82);

      // 6. The caption box is stamped on.
      tl.fromTo(
        q('.js-caption'),
        { scale: 1.45, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.2)' },
        0.72
      );

      // 7. The montage wipes in behind it all, last — it is scenery.
      q('.js-item').forEach((el, i) => {
        const rot = Number(el.dataset.rot || 0);
        tl.fromTo(
          el,
          { clipPath: HIDDEN, rotate: rot, y: 10 },
          { clipPath: SHOWN, rotate: rot, y: 0, duration: 0.4 },
          0.5 + i * 0.09
        );
      });

      // --- Ambient: the sheet never quite settles -------------------------

      // Two plates drifting out of register against each other.
      gsap.to(q('.js-plate-a'), {
        x: 7,
        y: -5,
        duration: 13,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(q('.js-plate-b'), {
        x: -9,
        y: 6,
        duration: 17,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      // The press light rakes across the sheet.
      gsap.fromTo(
        q('.js-beam'),
        { xPercent: -140 },
        { xPercent: 240, duration: 7.5, ease: 'power2.inOut', repeat: -1, repeatDelay: 5.5, delay: 1.6 }
      );

      // The montage breathes, each panel on its own clock.
      q('.js-item').forEach((el, i) => {
        const rot = Number(el.dataset.rot || 0);
        gsap.to(el, {
          y: i % 2 ? 9 : -9,
          rotate: rot + (i % 2 ? -1.5 : 1.5),
          duration: 5 + i * 1.3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.2 + i * 0.4,
        });
      });
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  // --- Pointer parallax ---------------------------------------------------
  // Depth by layer: dots barely move, the montage moves most.
  useEffect(() => {
    if (reduced || !root.current) return;
    const el = root.current;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const ctx = gsap.context((self) => {
      const q = self.selector;
      // Parallax rides on xPercent/yPercent so it never fights the ambient
      // loops above, which own x/y/rotate. Percent is relative to each
      // element's OWN size, so these are tuned per layer to land at roughly
      // the pixel travel noted — the small montage panels need a much larger
      // percentage than the oversized plates to move further on screen.
      const layers = [
        [q('.js-plate-a'), 1.5], // ~3px  — barely moves
        [q('.js-plate-b'), 2.5], // ~5px
        [q('.js-burst'), 3], // ~12px
        [q('.js-copy'), 1.2], // ~6px  — copy stays readable
        [q('.js-item'), 11], // ~14px — the montage moves most
      ];

      const setters = layers
        .filter(([targets]) => targets.length)
        .map(([targets, travel]) => ({
          x: gsap.quickTo(targets, 'xPercent', { duration: 0.9, ease: 'power3.out' }),
          y: gsap.quickTo(targets, 'yPercent', { duration: 0.9, ease: 'power3.out' }),
          travel,
        }));

      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        // -1 … 1 across the splash, so `travel` reads as max percent either way.
        const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
        setters.forEach(({ x, y, travel }) => {
          x(-nx * travel);
          y(-ny * travel);
        });
      };

      const onLeave = () => setters.forEach(({ x, y }) => (x(0), y(0)));

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      self.add(() => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      });
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  // --- Rotating narration -------------------------------------------------
  // Comic captions advance the story. Under reduced motion the first line
  // simply stays put — rotating text is exactly what that setting is for.
  useEffect(() => {
    if (reduced || narration.length < 2) return;
    const t = setInterval(() => setBeat((b) => (b + 1) % narration.length), 4600);
    return () => clearInterval(t);
  }, [reduced, narration.length]);

  useLayoutEffect(() => {
    if (reduced || narration.length < 2) return;
    const ctx = gsap.context((self) => {
      gsap.fromTo(
        self.selector('.js-beat'),
        { clipPath: HIDDEN, opacity: 0 },
        { clipPath: SHOWN, opacity: 1, duration: 0.36, ease: EASE }
      );
    }, root);
    return () => ctx.revert();
  }, [beat, reduced, narration.length]);

  return (
    <div
      ref={root}
      className={`relative min-h-[240px] shrink-0 xl:min-h-screen xl:w-[58%] ${className}`}
    >
      <div className="js-splash panel h-full">
        <div
          className={`panel__in panel__in--flush relative h-full min-h-[240px] justify-end ${
            isCrimson ? 'panel__in--crimson' : 'panel__in--night'
          }`}
        >
          {/* --- Plate A: the base halftone screen --------------------- */}
          <span
            aria-hidden="true"
            className={`js-plate js-plate-a pointer-events-none absolute -inset-12 ${
              isCrimson ? 'screen-coarse' : 'screen-night'
            }`}
          />

          {/* --- Plate B: a coarser screen, out of register ------------- */}
          <span
            aria-hidden="true"
            className="js-plate js-plate-b pointer-events-none absolute -inset-12 opacity-45"
            style={{
              backgroundImage: isCrimson
                ? 'radial-gradient(rgba(11,13,17,.3) 2px, transparent 2.2px)'
                : 'radial-gradient(rgba(192,53,58,.3) 2px, transparent 2.2px)',
              backgroundSize: '15px 15px',
            }}
          />

          {/* --- Ben-day burst behind the lettering --------------------- */}
          <span
            aria-hidden="true"
            className={`js-burst screen-coarse pointer-events-none absolute -bottom-24 -left-24 h-[420px] w-[420px] rounded-full ${
              isCrimson ? 'opacity-20' : 'opacity-[0.14]'
            }`}
          />

          {/* --- Impact lines ------------------------------------------ */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-[14%] hidden w-[62%] -rotate-[18deg] space-y-[13px] xl:block"
          >
            {STREAKS.map((s, i) => (
              <span
                key={i}
                className={`js-streak ml-auto block origin-right ${
                  isCrimson ? 'bg-paper-3' : 'bg-crimson'
                }`}
                style={{ width: s.w, height: s.h, opacity: s.o }}
              />
            ))}
          </div>

          {/* --- The press light --------------------------------------- */}
          <span
            aria-hidden="true"
            className="js-beam pointer-events-none absolute inset-y-0 left-0 w-[38%]"
            style={{
              backgroundImage: isCrimson
                ? 'linear-gradient(104deg, transparent 0%, rgba(242,239,231,.10) 50%, transparent 100%)'
                : 'linear-gradient(104deg, transparent 0%, rgba(175,196,216,.13) 50%, transparent 100%)',
            }}
          />

          {/* --- The montage ------------------------------------------- */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden xl:block">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} data-rot={item.rot} className={`js-item absolute ${item.cls}`}>
                  <div className="panel">
                    <div className="panel__in panel__in--flush relative">
                      <div className="art h-[78px]">
                        <Icon className="h-8 w-8 text-ink" strokeWidth={2.5} />
                      </div>
                      <span className={`slab !text-[15px] ${item.free ? 'slab--free' : ''}`}>
                        {item.price}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* On the crimson splash the caption goes to paper — one crimson
              element per screen region. */}
          {caption && (
            <CaptionBox corner="tl" tone={isCrimson ? 'paper' : 'crimson'} className="js-caption">
              {caption}
            </CaptionBox>
          )}

          {/* --- Copy --------------------------------------------------- */}
          <div className="js-copy relative px-7 pb-10 pt-20 sm:px-12 sm:pb-14 xl:px-16 xl:pb-20">
            <h1
              className={`max-w-[13ch] font-display text-[46px] leading-[0.92] tracking-[.015em] text-paper-3 sm:text-[64px] xl:text-[78px] ${
                isCrimson ? '[&_em]:text-ink' : '[&_em]:text-crimson'
              } [&_em]:not-italic`}
            >
              {headline.map((line, i) => (
                <span key={i} className="js-line block">
                  <span className="js-hit inline-block">{line}</span>
                </span>
              ))}
            </h1>

            {blurb && (
              <p className="js-blurb mt-5 max-w-[46ch] text-[14.5px] font-semibold leading-relaxed text-ice">
                {blurb}
              </p>
            )}

            {narration.length > 0 && (
              <p
                className={`js-narration mt-7 hidden max-w-[42ch] border-l-[3px] pl-3 text-[12px] font-bold uppercase leading-relaxed tracking-[.06em] xl:block ${
                  isCrimson ? 'border-ink text-paper-3' : 'border-crimson text-ice/90'
                }`}
                aria-live="off"
              >
                <span key={beat} className="js-beat inline-block">
                  {narration[beat]}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
