// Dropdown. Same chrome and field class as Input, with the native arrow
// replaced by an ink chevron — the default one is rounded and tinted by the
// OS, which is the one bit of chrome this system cannot restyle otherwise.
import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

import { FieldShell } from './Field';
import { fieldClass } from './fieldStyles';

const Select = forwardRef(
  (
    { label, error, hint, options = [], placeholder, className = '', id, containerClassName = '', ...props },
    ref
  ) => {
    const reactId = useId();
    const inputId = id || props.name || reactId;

    return (
      <FieldShell
        label={label}
        error={error}
        hint={hint}
        htmlFor={inputId}
        className={containerClassName}
      >
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={fieldClass(Boolean(error), `cursor-pointer appearance-none pr-10 ${className}`)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
            strokeWidth={2.75}
          />
        </div>
      </FieldShell>
    );
  }
);

Select.displayName = 'Select';

export default Select;
