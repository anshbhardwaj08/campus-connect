// Bangers label, 3px ink border, hard 4px offset shadow with no blur.
// On :active the button translates 4px and the shadow collapses to zero,
// so it presses physically. Minimum height 46px — that is the tap target
// floor for the whole system.
//
// `primary` is crimson. Remember there is only ever ONE crimson element in
// a screen region, so a panel with a crimson button gets a paper caption.
// `link` is an underlined text button, for secondary actions — never put
// two filled buttons next to each other. Pass `tone="paper"` when a link
// button sits on an ink ground (the masthead, a night panel) so the text
// stays legible instead of defaulting to ink-on-ink.

import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-crimson text-paper-3 border-ink shadow-hard',
  ink: 'bg-ink text-paper-3 border-ink shadow-hard',
  paper: 'bg-paper-3 text-ink border-ink shadow-hard',
  cold: 'bg-ice text-ink border-ink shadow-hard',
};

const SIZES = {
  sm: 'text-[15px] px-3.5 min-h-[46px] gap-2',
  md: 'text-[17px] px-5 min-h-[46px] gap-2',
  lg: 'text-[20px] px-6 min-h-[54px] gap-2.5',
};

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      tone = 'ink', // link variant only: 'ink' (paper grounds) | 'paper' (ink grounds)
      className = '',
      ...props
    },
    ref
  ) => {
    // Underlined text button. Carries no fill and no border, so it never
    // competes with the one crimson action on screen.
    if (variant === 'link') {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 font-sans text-[13px] font-extrabold uppercase tracking-[.07em] underline decoration-2 underline-offset-4 transition-colors hover:text-crimson disabled:pointer-events-none disabled:opacity-45 ${
            tone === 'paper' ? 'text-paper-3' : 'text-ink'
          } ${className}`}
          {...props}
        >
          {children}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex select-none items-center justify-center whitespace-nowrap border-[3px] font-display uppercase leading-none tracking-[.04em] transition-[transform,box-shadow] duration-75 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// No spinner library, no blur, no gradient. Three dots that blink in
// sequence — the printed equivalent of a loading state.
function Spinner() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Working">
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </span>
  );
}

function Dot({ delay }) {
  return (
    <span
      className="h-1.5 w-1.5 bg-current"
      style={{ animation: 'blink 900ms steps(1,end) infinite', animationDelay: delay }}
    />
  );
}

export default Button;
