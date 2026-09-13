// Styled text input with label, error state, and a show/hide toggle for
// password fields. `tone="glass"` is for dark frosted surfaces (auth screens).
// forwardRef so it plugs directly into react-hook-form's register()
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const TONES = {
  default: {
    label: 'text-zinc-700 dark:text-zinc-300',
    icon: 'text-zinc-400',
    base: 'bg-white text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
    normal:
      'border-zinc-200 focus:border-violet-400 focus:ring-violet-100 dark:border-zinc-700 dark:focus:ring-violet-900/30',
    error:
      'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-800 dark:focus:ring-red-900/30',
  },
  glass: {
    label: 'text-zinc-300',
    icon: 'text-zinc-500',
    base: 'bg-white/[0.04] text-white placeholder:text-zinc-500 focus:bg-white/[0.07]',
    normal: 'border-white/10 focus:border-violet-400/60 focus:ring-violet-500/20',
    error: 'border-red-500/50 focus:border-red-400/60 focus:ring-red-500/20',
  },
};

const Input = forwardRef(
  ({ label, error, icon: Icon, type, tone = 'default', className = '', id, ...props }, ref) => {
    const [reveal, setReveal] = useState(false);
    const inputId = id || props.name;
    const isPassword = type === 'password';
    const t = TONES[tone];

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={`mb-1.5 block text-sm font-medium ${t.label}`}>
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.icon}`} />
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && reveal ? 'text' : type}
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 ${t.base} ${
              error ? t.error : t.normal
            } ${Icon ? 'pl-9' : ''} ${isPassword ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setReveal((v) => !v)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition hover:opacity-80 ${t.icon}`}
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
