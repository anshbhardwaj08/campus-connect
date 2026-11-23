// The price, stamped into the bottom-right corner of an art well.
// Bangers on ink, or on crimson when the item is free.
//
// Scales in on the x-axis from the right, delayed until after the panel
// wipe has finished.

import { useLayoutEffect, useRef } from 'react';
import { gsap, slabIn } from '../../lib/motion';
import formatPrice, { PERIOD_LABEL } from '../../utils/formatPrice';

export default function PriceSlab({
  price,
  was = null,
  period = null,
  // One word in front of the number, for a slab that is not stating a price.
  // The wanted board uses "up to": a budget stamped the way a price is
  // stamped reads as an asking price, and that card is already at risk of
  // being mistaken for a listing.
  prefix = null,
  animate = true,
  className = '',
}) {
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
      {prefix && !free && <span className="slab__prefix">{prefix}</span>}
      <span>
        {free ? 'FREE' : formatPrice(price)}
        {/* The rate's period rides at a smaller size so the number still
            carries the slab — "/DAY" is the qualifier, not the point. */}
        {!free && period && (
          <span className="ml-0.5 text-[0.62em] tracking-[.04em]">
            /{(PERIOD_LABEL[period] || period).toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}
