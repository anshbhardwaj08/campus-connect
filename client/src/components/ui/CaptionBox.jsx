// Narration pinned to a panel corner — the strongest signal of the theme
// and the easiest thing to overuse. One per panel, maximum.
//
// A caption is narration, not a label: "Meanwhile, two floors up" is a
// caption. "Product details" is a heading and belongs in Work Sans.
//
// Keep it third person and present tense. If the panel already has a
// crimson button, this caption should NOT also be crimson — one crimson
// element per screen region.

export default function CaptionBox({
  children,
  corner = 'tl', // tl | tr | bl | br
  tone = 'paper', // paper | crimson
  className = '',
}) {
  return (
    <span
      className={`caption caption--${corner} ${tone === 'crimson' ? 'caption--crimson' : ''} ${className}`}
    >
      {children}
    </span>
  );
}
