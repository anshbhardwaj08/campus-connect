// The filter rail on Browse. Sticky on desktop, collapsible on mobile.
//
// It holds no state of its own — everything lives in the URL, so a filtered
// view is shareable, survives a refresh, and the back button steps through
// filter changes the way people expect.
import { SlidersHorizontal, X } from 'lucide-react';

import Select from '../ui/Select';
import Input from '../ui/Input';
import { useCategories } from '../../hooks/useCategories';
import { conditions } from '../../constants/conditions';

const CONDITION_LABEL = {
  new: 'New',
  'like-new': 'Like new',
  used: 'Used',
  'for-parts': 'For parts',
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export default function FilterPanel({ filters, onChange, onReset, activeCount = 0, className = '' }) {
  const categories = useCategories();
  const set = (key) => (e) => onChange(key, e.target.value);

  return (
    <div className={`border-2 border-ink bg-paper-3 p-3.5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="label-xs flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.5} />
          Narrow it down
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-steel transition-colors hover:text-crimson"
          >
            <X className="h-3 w-3" strokeWidth={3} /> Clear {activeCount}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <Select
          label="Category"
          placeholder="Everything"
          value={filters.category}
          onChange={set('category')}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />

        <Select
          label="Condition"
          placeholder="Any condition"
          value={filters.condition}
          onChange={set('condition')}
          options={conditions.map((c) => ({ value: c, label: CONDITION_LABEL[c] || c }))}
        />

        <div>
          <p className="label-xs mb-1.5">Price (₹)</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              placeholder="Min"
              aria-label="Minimum price"
              value={filters.minPrice}
              onChange={set('minPrice')}
            />
            <span className="shrink-0 text-[12px] font-bold text-steel">to</span>
            <Input
              type="number"
              min="0"
              placeholder="Max"
              aria-label="Maximum price"
              value={filters.maxPrice}
              onChange={set('maxPrice')}
            />
          </div>
        </div>

        <Select
          label="Sort by"
          value={filters.sort || 'recent'}
          onChange={set('sort')}
          options={SORT_OPTIONS}
        />
      </div>

      <p className="meta mt-4 border-l-[3px] border-ink/20 pl-2.5 leading-relaxed">
        Meet at the gate. Look it over. Then pay.
      </p>
    </div>
  );
}

// Shown above the grid so it is obvious what is currently filtering the
// results — a filter you cannot see is a filter you forget you set.
export function ActiveFilterChips({ filters, onClear }) {
  const categories = useCategories();
  const chips = [];
  if (filters.q) chips.push(['q', `“${filters.q}”`]);
  if (filters.category) {
    const cat = categories.find((c) => c.slug === filters.category);
    chips.push(['category', cat?.name || filters.category]);
  }
  if (filters.condition) chips.push(['condition', CONDITION_LABEL[filters.condition] || filters.condition]);
  if (filters.minPrice) chips.push(['minPrice', `from ₹${filters.minPrice}`]);
  if (filters.maxPrice) chips.push(['maxPrice', `up to ₹${filters.maxPrice}`]);

  if (!chips.length) return null;

  return (
    <div className="mb-[9px] flex flex-wrap gap-1.5">
      {chips.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onClear(key)}
          aria-label={`Remove filter: ${label}`}
          className="inline-flex items-center gap-1.5 border-2 border-ink bg-paper-2 px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[.06em] text-ink transition-colors hover:bg-crimson hover:text-paper-3"
        >
          {label}
          <X className="h-2.5 w-2.5" strokeWidth={3.5} />
        </button>
      ))}
    </div>
  );
}
