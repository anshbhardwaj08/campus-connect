// Small pill-shaped status/label badge (listing status, condition, etc.)
const TONES = {
  neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  brand: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

export default function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
