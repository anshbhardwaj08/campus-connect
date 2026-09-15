// Shared chrome for every form control: the uppercase steel label above and
// the inline crimson error below.
//
// Input, Textarea and Select all build on this rather than each carrying
// their own copy — three copies of a class string is exactly how a design
// system drifts out of uniformity one field at a time. The class string
// itself lives in fieldStyles.js.

// Errors print inline in crimson directly under the field — never a toast,
// never a modal, and never a coloured border alone.
export function FieldShell({ label, error, hint, htmlFor, className = '', children }) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="label-xs mb-1.5 block">
          {label}
        </label>
      )}

      {children}

      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[11.5px] font-bold leading-snug text-crimson">
          {error}
        </p>
      )}

      {hint && !error && <p className="meta mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

export default FieldShell;
