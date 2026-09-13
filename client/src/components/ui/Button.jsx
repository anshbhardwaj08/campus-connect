// Primary interactive button with gradient/outline/ghost/danger variants
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 hover:-translate-y-0.5 focus-visible:ring-violet-300',
  secondary:
    'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 focus-visible:ring-violet-200',
  outline:
    'border border-zinc-200 text-zinc-700 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-violet-500 dark:hover:bg-violet-500/10 focus-visible:ring-violet-200',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 focus-visible:ring-zinc-200',
  danger:
    'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30 focus-visible:ring-red-300',
};

const SIZES = {
  sm: 'text-sm px-3.5 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-5 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-6 py-3.5 rounded-xl gap-2',
};

const Button = forwardRef(
  (
    { children, variant = 'primary', size = 'md', loading = false, disabled, className = '', ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center whitespace-nowrap font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] active:translate-y-0 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
