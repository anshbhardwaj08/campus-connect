// The control that opens a photo full size.
//
// Pinned to the BOTTOM-LEFT of an art well, which is the one corner free on
// every card in the product: listings carry the condition badge top-left,
// "For rent" top-right and the price slab bottom-right; events carry the
// category top-left and a slab bottom-right; lost-and-found carries
// Lost/Found top-left and "Back with its owner" top-right. One place for it
// everywhere means a student learns it once.
//
// Deliberately always visible, not revealed on hover. A control that appears
// only under a cursor is a control that does not exist on a phone — `:hover`
// sticks after a tap on a touch screen, so the reveal would either never
// happen or never undo. It is also the more discoverable of the two, and an
// inked square with a glyph in it belongs on this page anyway.
//
// 46px square, which is the accessibility floor for a tap target rather than
// a size that was picked by eye. It balances against the price slab opposite.
import { Maximize2 } from 'lucide-react';

export default function PhotoExpand({ onClick, label = 'View photo', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // `relative z-10` matters on a card whose title link is stretched
      // across the whole surface to make the card clickable: without it the
      // link sits on top and this button can never be pressed.
      className={`absolute bottom-0 left-0 z-10 flex h-[46px] w-[46px] items-center justify-center border-2 border-b-0 border-l-0 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3 ${className}`}
    >
      <Maximize2 className="h-4 w-4" strokeWidth={3} />
    </button>
  );
}
