// GSAP is the motion engine for the whole system. Every animation in the app
// comes from this file so the curves and durations stay in one place.
//
// The system's vocabulary is deliberately small:
//   panelWipe  — panels wipe in left to right on navigation
//   slabIn     — price slabs scale in from the right, after the wipe
//   stampIn    — caption boxes land like a rubber stamp
//   lineIn     — Bangers headline lines snap in off the left
//   drawIn     — plotted lines ink themselves in, left to right
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

// Plotted lines ink themselves onto the page from left to right.
// The target must carry pathLength="1" so dash units are fractions of the
// path's own length and one duration suits every line whatever its shape.
export function drawIn(targets, vars = {}) {
  if (!targets) return null;

  if (prefersReducedMotion()) {
    gsap.set(targets, { strokeDashoffset: 0 });
    return null;
  }

  return gsap.fromTo(
    targets,
    { strokeDashoffset: 1 },
    {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: EASE,
      stagger: 0.12,
      ...vars,
    }
  );
}

// A nudge that rises from the bottom edge of the screen, used for the scroll
// cue on a listing. It comes UP rather than fading in, because the thing it
// points at is below — the direction of the motion is the message.
//
// A little overshoot on the way in so it reads as landing rather than
// sliding; none on the way out, which should be quick and unremarkable.
export function cueIn(targets, vars = {}) {
  if (!targets) return null;

  if (prefersReducedMotion()) {
    gsap.set(targets, { y: 0, opacity: 1 });
    return null;
  }

  return gsap.fromTo(
    targets,
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.44, ease: 'back.out(1.7)', ...vars }
  );
}

export function cueOut(targets, vars = {}) {
  if (!targets) return vars.onComplete?.();

  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 0 });
    vars.onComplete?.();
    return null;
  }

  return gsap.to(targets, { y: 14, opacity: 0, duration: 0.22, ease: 'power2.in', ...vars });
}

export { gsap };
