// A printed stamp, not a pill. Flat fill, 2px ink border, no radius.
//
// Success, warning and info states all use ink, steel and crimson at
// different weights and fills — do NOT add a second accent when a state
// needs a colour. Because colour alone must never carry meaning, every
// tone here also differs in fill and weight.

const TONES = {
  ink: 'bg-ink text-paper-3 border-ink',
  paper: 'bg-paper-2 text-ink border-ink',
  crimson: 'bg-crimson text-paper-3 border-ink',
  cold: 'bg-ice text-ink border-ink',
  outline: 'bg-transparent text-ink border-ink',
};

export default function Badge({ children, tone = 'paper', className = '' }) {
  return (
    <span
      className={`inline-flex items-center border-2 px-2 py-[3px] text-[9.5px] font-extrabold uppercase leading-none tracking-[.08em] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
