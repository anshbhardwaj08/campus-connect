// The search and filter page. Everything the masthead's GO button and
// Home's category links point at lands here.
//
// All filter state lives in the URL rather than in component state, so a
// filtered view is shareable, survives a refresh, and the browser's back
// button steps back through filter changes instead of leaving the page.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import ListingGrid from '../../components/listing/ListingGrid';
import SearchBar from '../../components/search/SearchBar';
import FilterPanel, { ActiveFilterChips } from '../../components/search/FilterPanel';
import Button from '../../components/ui/Button';

const PER_PAGE = 24;
const FILTER_KEYS = ['q', 'listingType', 'category', 'condition', 'minPrice', 'maxPrice'];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters = useMemo(
    () => ({
      q: params.get('q') || '',
      listingType: params.get('listingType') || '',
      category: params.get('category') || '',
      condition: params.get('condition') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      sort: params.get('sort') || 'recent',
    }),
    [params]
  );

  const page = Math.max(Number(params.get('page')) || 1, 1);
  const activeCount = FILTER_KEYS.filter((k) => filters[k]).length;

  // Any filter change resets to page 1 — staying on page 5 of a result set
  // that just shrank to two pages shows an empty grid for no visible reason.
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (filters.sort !== 'recent') next.set('sort', filters.sort);
    setParams(next);
  };

  const goToPage = (n) => {
    const next = new URLSearchParams(params);
    if (n > 1) next.set('page', String(n));
    else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['listings', 'browse', filters, page],
    queryFn: () =>
      api
        .get('/listings', {
          params: {
            ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
            page,
            limit: PER_PAGE,
          },
        })
        .then((r) => r.data),
    // Keeps the previous page on screen while the next one loads, instead of
    // collapsing to skeletons on every filter tweak.
    placeholderData: keepPreviousData,
  });

  const listings = data?.data?.listings || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total ?? 0;

  return (
    <PageWrapper>
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          THE WHOLE <span className="text-crimson">PAGE</span>
        </h1>
        <p className="meta mt-2">
          {isLoading
            ? 'Counting what is on the page…'
            : `${total} ${total === 1 ? 'panel' : 'panels'}${activeCount ? ' match your filters' : ' on the page'}`}
        </p>
      </header>

      <div className="mb-[9px] lg:hidden">
        <SearchBar initialValue={filters.q} onSearch={(q) => setFilter('q', q)} />
      </div>

      <div className="lg:flex lg:items-start lg:gap-[9px]">
        {/* --- Filter rail ---------------------------------------------- */}
        <div className="shrink-0 lg:sticky lg:top-[76px] lg:w-[230px]">
          <Button
            variant="paper"
            size="sm"
            className="mb-[9px] w-full lg:hidden"
            onClick={() => setMobileFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
            {mobileFiltersOpen ? 'Hide filters' : `Filters${activeCount ? ` (${activeCount})` : ''}`}
          </Button>

          <FilterPanel
            filters={filters}
            onChange={setFilter}
            onReset={resetFilters}
            activeCount={activeCount}
            className={`${mobileFiltersOpen ? 'block' : 'hidden'} mb-[9px] lg:mb-0 lg:block`}
          />
        </div>

        {/* --- Results --------------------------------------------------- */}
        <div className="min-w-0 flex-1">
          <ActiveFilterChips filters={filters} onClear={(key) => setFilter(key, '')} />

          <div className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : ''}>
            <ListingGrid
              listings={listings}
              loading={isLoading}
              emptyText={
                activeCount
                  ? 'Nothing matches that. Loosen a filter and try again.'
                  : 'No listings yet. This page opens the moment someone posts.'
              }
            />
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-[9px] flex items-center justify-between border-2 border-ink bg-paper-3 px-3 py-2"
              aria-label="Pagination"
            >
              <Button
                variant="paper"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={3} /> Back
              </Button>

              <p className="text-[11.5px] font-extrabold uppercase tracking-[.06em] text-ink">
                Page {page} of {totalPages}
              </p>

              <Button
                variant="paper"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" strokeWidth={3} />
              </Button>
            </nav>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
