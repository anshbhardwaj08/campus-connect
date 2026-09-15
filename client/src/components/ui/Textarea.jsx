// Multi-line field. Same chrome and same field class as Input — the only
// differences are the row count and that it never auto-resizes horizontally.
import { forwardRef, useId } from 'react';

import { FieldShell } from './Field';
import { fieldClass } from './fieldStyles';

const Textarea = forwardRef(
  ({ label, error, hint, rows = 5, className = '', id, containerClassName = '', ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={fieldClass(Boolean(error), `resize-y leading-relaxed ${className}`)}
          {...props}
        />
      </FieldShell>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
