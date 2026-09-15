// The price, stamped into the bottom-right corner of an art well.
// Bangers on ink, or on crimson when the item is free.
//
// Scales in on the x-axis from the right, delayed until after the panel
// wipe has finished.

import { useLayoutEffect, useRef } from 'react';
import { gsap, slabIn } from '../../lib/motion';
import formatPrice from '../../utils/formatPrice';

export default function PriceSlab({ price, was = null, animate = true, className = '' }) {
  const free = !price || Number(price) === 0;
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!animate || !ref.current) return;
    const ctx = gsap.context(() => slabIn(ref.current), ref);
    return () => ctx.revert();
  }, [animate]);

  return (
    <span ref={ref} className={`slab ${free ? 'slab--free' : ''} ${className}`}>
      {was && !free && <span className="slab__was">{formatPrice(was)}</span>}
      <span>{free ? 'FREE' : formatPrice(price)}</span>
    </span>
  );
}
