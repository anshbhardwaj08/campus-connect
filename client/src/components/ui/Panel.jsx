// The comic panel — the only container in this system.
//
// Two-layer sandwich: an ink layer with 3px padding, and a paper layer
// inside it. Both are clipped with the same sub-1% polygon so the border
// reads as hand-inked rather than as a CSS rule.
//
// The wipe is driven by GSAP (see lib/motion.js), set up in a layout effect
// so the "from" state is applied before paint and the panel never flashes.
// With JS off the panel simply renders visible.
//
// Never reach for a rounded card, a drop shadow with blur, or a component
// library surface. Anything that was a card, a section, or a modal is a
// Panel. See docs/design-system.md.

import { useLayoutEffect, useRef } from 'react';
import { gsap, panelWipe, STAGGER } from '../../lib/motion';

const TONES = {
  paper: '',
  night: 'panel__in--night',
  cold: 'panel__in--cold',
  crimson: 'panel__in--crimson',
};

export default function Panel({
  children,
  tone = 'paper',
  flush = false,
  screen = null, // 'coarse' | 'fine' | 'night'
  index = 0, // position in the wipe sequence; drives the .06s stagger
  animate = true,
  className = '',
  innerClassName = '',
  as: Tag = 'div',
  ...props
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!animate || !ref.current) return;
    const ctx = gsap.context(() => {
      panelWipe(ref.current, { delay: index * STAGGER });
    }, ref);
    return () => ctx.revert();
  }, [animate, index]);

  const screenClass = screen ? `screen-${screen}` : '';

  return (
    // `block` is not optional: the wrapper is what GSAP clips, and clip-path
    // on a `display: inline` element clips against the inline box rather than
    // the block children — which silently erases the whole panel. That is
    // exactly what happens when `as={Link}`, since <a> is inline by default.
    <Tag ref={ref} className={`block ${className}`} {...props}>
      <div className="panel h-full">
        <div
          className={`panel__in ${TONES[tone]} ${flush ? 'panel__in--flush' : ''} ${screenClass} ${innerClassName}`}
        >
          {children}
        </div>
      </div>
    </Tag>
  );
}
