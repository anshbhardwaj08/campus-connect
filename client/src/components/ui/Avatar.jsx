// User avatar image with a gradient-initials fallback when no photo exists
const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl',
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
      <img
        src={src}
        alt={name}
        className={`${SIZES[size]} rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 font-bold text-white ring-2 ring-white dark:ring-zinc-900 ${SIZES[size]} ${className}`}
    >
      {initials || '?'}
    </div>
  );
}
