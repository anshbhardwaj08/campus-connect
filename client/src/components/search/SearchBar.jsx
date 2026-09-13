// Search input for finding listings, debounced and submittable via Enter
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export default function SearchBar({ onSearch, placeholder = 'Search for textbooks, cycles, electronics...' }) {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, 400);

  useEffect(() => {
    if (debounced) onSearch?.(debounced);
  }, [debounced]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch?.(value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-violet-900/30"
      />
    </div>
  );
}
