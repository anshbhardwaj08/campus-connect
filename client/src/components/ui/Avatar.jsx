// A square ink chip with initials — no circles, no gradients.
//
// When there IS a photo it is shown true to life, same as listing photos —
// people should be recognisable from their avatar.

const SIZES = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-14 w-14 text-[18px]',
  xl: 'h-24 w-24 text-[30px]',
};

export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  if (src) {
    return (
      <span className={`art photo shrink-0 border-2 border-ink ${SIZES[size]} ${className}`}>
        <img src={src} alt={name} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-ink font-extrabold tracking-[.03em] text-paper-3 ${SIZES[size]} ${className}`}
      aria-hidden={name ? undefined : 'true'}
    >
      {initials || '?'}
    </span>
  );
}
