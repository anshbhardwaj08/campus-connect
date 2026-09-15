// A single-line field. Chrome (label, error, hint, the field class itself)
// comes from Field.jsx so Input, Textarea and Select stay identical.
//
// forwardRef so it plugs straight into react-hook-form's register().

import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { FieldShell } from './Field';
import { fieldClass } from './fieldStyles';

const Input = forwardRef(
  (
    { label, error, hint, type, className = '', id, containerClassName = '', ...props },
    ref
  ) => {
    const [reveal, setReveal] = useState(false);
    const reactId = useId();
    const inputId = id || props.name || reactId;
    const isPassword = type === 'password';

    return (
      <FieldShell
        label={label}
        error={error}
        hint={hint}
        htmlFor={inputId}
        className={containerClassName}
      >
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && reveal ? 'text' : type}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={fieldClass(Boolean(error), `${isPassword ? 'pr-11' : ''} ${className}`)}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              onClick={() => setReveal((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel transition-colors hover:text-ink"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </FieldShell>
    );
  }
);

Input.displayName = 'Input';

export default Input;
