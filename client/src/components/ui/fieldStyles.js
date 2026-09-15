// The one class string that defines what a form control looks like in this
// system. Lives in its own module (not Field.jsx) so that file can export
// only components and keep fast refresh working.
//
// Paper fill, 2px ink border, no radius. On focus the default outline is
// removed and replaced with a hard 3px crimson offset shadow.
export const fieldClass = (error = false, extra = '') =>
  `w-full border-2 bg-paper-3 px-3 py-3 font-sans text-[14px] font-semibold text-ink outline-none transition-shadow placeholder:font-medium placeholder:text-steel/70 focus:shadow-hard-crimson focus:outline-none ${
    error ? 'border-crimson' : 'border-ink'
  } ${extra}`;

export default fieldClass;
