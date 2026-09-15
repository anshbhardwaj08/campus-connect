// The split every auth screen uses.
//
// ~58% is the printed splash (see auth/AuthSplash.jsx), ~42% is a paper
// column holding the form, vertically centred. Below 1280px they stack,
// splash on top at a fixed minimum height.
//
// Only the headline, the narration and the form change between screens. If
// you are adding a new auth screen, add it here rather than inventing a
// second layout.

import { useLayoutEffect, useRef } from 'react';

import { gsap, prefersReducedMotion, EASE } from '../../lib/motion';
import AuthSplash from '../auth/AuthSplash';
import Wordmark from '../ui/Wordmark';

export default function AuthLayout({
  caption,
  headline = [], // array of lines; wrap a phrase in <em> for crimson
  blurb,
  narration = [],
  items,
  splashTone = 'night', // 'night' | 'crimson' (suspended / locked-out screens)
  children,
  footer,
}) {
  const col = useRef(null);

  // The form column comes in behind the splash: wordmark, then the heading
  // block, then the fields one at a time. Short and small — the splash is
  // doing the performing, this side just needs to arrive.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !col.current) return;

    const ctx = gsap.context((self) => {
      const q = self.selector;
      gsap
        .timeline({ defaults: { ease: EASE }, delay: 0.32 })
        .fromTo(q('.js-brand'), { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 })
        .fromTo(q('.js-head'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, '-=0.22')
        .fromTo(
          q('.js-field'),
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.36, stagger: 0.055 },
          '-=0.22'
        )
        .fromTo(q('.js-foot'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.1');
    }, col);

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex min-h-screen flex-col xl:flex-row">
      <AuthSplash
        caption={caption}
        headline={headline}
        blurb={blurb}
        narration={narration}
        items={items}
        tone={splashTone}
      />

      <div
        ref={col}
        className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 xl:px-12"
      >
        <div className="w-full max-w-[400px]">
          <div className="js-brand mb-9">
            <Wordmark size="md" />
          </div>

          {children}

          {footer && <div className="js-foot mt-8">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
