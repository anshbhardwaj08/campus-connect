// The one table in the system — UserList, AllListings, AllDeals and
// AuditLogs all use it. Search and pagination are server-driven (every list
// endpoint here already paginates), so this only owns client-side sorting
// of the current page.
//
// No table library: `@tanstack/react-table`'s installed version turned out
// to ship a rewritten, factory-based API (`createTableHook`,
// `constructTable`, feature objects) with none of the `useReactTable` /
// `getCoreRowModel()` surface the original stub was written against — the
// build failed with "not exported by react-table". A plain table with
// columns as `{ key, header, render, sortable, sortValue }` does everything
// these four pages need and has no version to drift out from under it.
import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import Skeleton from '../ui/Skeleton';
import { fieldClass } from '../ui/fieldStyles';

export default function DataTable({
  columns,
  data,
  isLoading,
  emptyTitle = 'Nothing here.',
  emptyText,
  search,
  page,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const rows = useMemo(() => {
    const list = data || [];
    if (!sort.key) return list;
    const col = columns.find((c) => c.key === sort.key);
    const getVal = col?.sortValue || ((row) => row[sort.key]);
    return [...list].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [data, sort, columns]);

  const toggleSort = (col) => {
    if (!col.sortable) return;
    setSort((s) =>
      s.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {search && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" strokeWidth={2.5} />
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || 'Search…'}
            className={fieldClass(false, 'pl-9')}
          />
        </div>
      )}

      <div className="border-[3px] border-ink bg-paper-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-[3px] border-ink bg-ink">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col)}
                    className={`whitespace-nowrap px-3 py-2.5 text-[10.5px] font-extrabold uppercase tracking-[.07em] text-paper-3/85 ${
                      col.sortable ? 'cursor-pointer select-none hover:text-paper-3' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable &&
                        sort.key === col.key &&
                        (sort.dir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" strokeWidth={3} />
                        ) : (
                          <ChevronDown className="h-3 w-3" strokeWidth={3} />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b-2 border-ink/10">
                    <td colSpan={columns.length} className="p-2.5">
                      <Skeleton className="h-9" />
                    </td>
                  </tr>
                ))}

              {!isLoading && !rows.length && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-14 text-center">
                    <p className="text-[13px] font-extrabold text-ink">{emptyTitle}</p>
                    {emptyText && <p className="meta mx-auto mt-1 max-w-xs leading-relaxed">{emptyText}</p>}
                  </td>
                </tr>
              )}

              {!isLoading &&
                rows.map((row) => (
                  <tr key={row._id || row.id} className="border-b-2 border-ink/10 last:border-b-0 hover:bg-paper-2/50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2.5 align-middle text-[12.5px] font-semibold text-ink">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {page && page.total > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => page.onChange(page.current - 1)}
            disabled={page.current <= 1}
            className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper-3 text-ink transition-colors hover:bg-paper-2 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <span className="meta">
            Page {page.current} of {page.total}
          </span>
          <button
            type="button"
            onClick={() => page.onChange(page.current + 1)}
            disabled={page.current >= page.total}
            className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper-3 text-ink transition-colors hover:bg-paper-2 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
