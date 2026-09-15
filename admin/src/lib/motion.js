// GSAP is the motion engine for the whole system. Every animation in the app
// comes from this file so the curves and durations stay in one place.
//
// The system's vocabulary is deliberately small:
//   panelWipe  — panels wipe in left to right on navigation
//   slabIn     — price slabs scale in from the right, after the wipe
//   stampIn    — caption boxes land like a rubber stamp
//   lineIn     — Bangers headline lines snap in off the left
//
// Everything is wrapped so that `prefers-reduced-motion: reduce` lands on the
// final state instantly instead of playing. Never call gsap.from() directly in
// a component — go through these, or reduced motion will leak.

import { gsap } from 'gsap';

export const EASE = 'power3.out';
export const WIPE_DURATION = 0.4;
export const STAGGER = 0.06;

export const HIDDEN = 'inset(0 100% 0 0)';
export const SHOWN = 'inset(0 0% 0 0)';

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Panels wipe in left to right, .06s apart.
export function panelWipe(targets, vars = {}) {
  if (!targets || (Array.isArray(targets) && !targets.length)) return null;

  if (prefersReducedMotion()) {
    gsap.set(targets, { clipPath: SHOWN, opacity: 1 });
    return null;
  }

  return gsap.fromTo(
    targets,
    { clipPath: HIDDEN },
    {
      clipPath: SHOWN,
      duration: WIPE_DURATION,
      ease: EASE,
      stagger: STAGGER,
      ...vars,
    }
  );
}

// Price slabs scale in on the x-axis from the right, delayed until after the
// wipe has finished.
export function slabIn(targets, vars = {}) {
  if (!targets) return null;

  if (prefersReducedMotion()) {
    gsap.set(targets, { scaleX: 1 });
    return null;
  }

  return gsap.fromTo(
    targets,
    { scaleX: 0 },
    {
      scaleX: 1,
      transformOrigin: 'right center',
      duration: 0.26,
      ease: EASE,
      delay: WIPE_DURATION,
      ...vars,
    }
  );
}

// Caption boxes land like a rubber stamp: overshoot down onto the page.
export function stampIn(targets, vars = {}) {
  if (!targets) return null;

  if (prefersReducedMotion()) {
    gsap.set(targets, { scale: 1, opacity: 1 });
    return null;
  }

  return gsap.fromTo(
    targets,
    { scale: 1.45, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.34, ease: 'back.out(2.2)', ...vars }
  );
}

// Bangers headline lines snap in from the left with a slight skew, as if the
// lettering were being dragged onto the page.
export function lineIn(targets, vars = {}) {
  if (!targets) return null;

  if (prefersReducedMotion()) {
    gsap.set(targets, { x: 0, skewX: 0, opacity: 1, clipPath: SHOWN });
    return null;
  }

  return gsap.fromTo(
    targets,
    { x: -44, skewX: 9, opacity: 0, clipPath: HIDDEN },
    {
      x: 0,
      skewX: 0,
      opacity: 1,
      clipPath: SHOWN,
      duration: 0.62,
      ease: 'power4.out',
      stagger: 0.09,
      ...vars,
    }
  );
}

export { gsap };
