// The masthead search: a field and a crimson GO button, the same combo
// from the reference masthead. Debounced as you type; Enter or GO submits
// immediately without waiting for the debounce.
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

export default function SearchBar({
  onSearch,
  initialValue = '',
  placeholder = 'Search the page — cycles, books, drafters…',
  className = '',
}) {
  const [value, setValue] = useState(initialValue);
  const debounced = useDebounce(value, 400);

  // Only search once the field has actually been typed in. Without this the
  // debounce fires on mount with whatever seeded the field, which on Browse
  // means re-writing the `q` the URL already had.
  const touched = useRef(false);

  // Callers pass an inline arrow, so `onSearch` is a new function every
  // render. Kept in a ref, the debounce effect can depend on the debounced
  // value alone without either going stale or re-firing constantly.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    if (!touched.current) return;
    onSearchRef.current?.(debounced);
  }, [debounced]);

  const submit = () => {
    touched.current = true;
    onSearch?.(value.trim());
  };

  return (
    <div className={`flex ${className}`}>
      <input
        type="search"
        value={value}
        onChange={(e) => {
          touched.current = true;
          setValue(e.target.value);
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        aria-label="Search listings"
        className="min-w-0 flex-1 border-2 border-ink bg-paper-3 px-3.5 py-2.5 font-sans text-[13.5px] font-semibold text-ink outline-none transition-shadow placeholder:font-medium placeholder:text-steel/70 focus:shadow-hard-crimson focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="shrink-0 border-2 border-l-0 border-ink bg-crimson px-4 font-display text-[16px] uppercase leading-none tracking-[.04em] text-paper-3 transition-[transform,box-shadow] duration-75 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5"
      >
        Go
      </button>
    </div>
  );
}
