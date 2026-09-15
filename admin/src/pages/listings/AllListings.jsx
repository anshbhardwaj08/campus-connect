// Every listing on the marketplace, whatever its status. Read-only — the
// actions that change a listing's status (approve/reject) live in
// PendingListings, which is the queue with real consequences; this is a
// browse-and-check surface.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import adminApi from '../../services/adminApi';
import AdminNavbar from '../../components/layout/AdminNavbar';
import DataTable from '../../components/tables/DataTable';
import Badge from '../../components/ui/Badge';
import formatPrice from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';

const STATUSES = ['', 'active', 'pending', 'sold', 'expired', 'rejected'];
const STATUS_TONE = { active: 'ink', pending: 'crimson', sold: 'outline', expired: 'outline', rejected: 'crimson' };

export default function AllListings() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', 'all', { status, page }],
    queryFn: () =>
      adminApi.get('/admin/listings', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Listing',
        sortable: true,
        sortValue: (row) => row.title,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-extrabold text-ink">{row.title}</p>
            <p className="truncate text-[11px] font-semibold text-steel">{row.sellerId?.name}</p>
          </div>
        ),
      },
      { key: 'category', header: 'Category', sortable: true, sortValue: (row) => row.category },
      {
        key: 'price',
        header: 'Price',
        sortable: true,
        sortValue: (row) => (row.isFree ? 0 : row.price),
        render: (row) => formatPrice(row.isFree ? 0 : row.price),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (row) => row.status,
        render: (row) => <Badge tone={STATUS_TONE[row.status] || 'paper'}>{row.status}</Badge>,
      },
      {
        key: 'createdAt',
        header: 'Posted',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        render: (row) => <span className="text-steel">{timeAgo(row.createdAt)}</span>,
      },
    ],
    []
  );

  return (
    <>
      <AdminNavbar
        title="All listings"
        blurb={`${data?.pagination?.total ?? '…'} total.`}
        actions={
          <div className="flex gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`border-2 px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[.05em] transition-colors ${
                  status === s ? 'border-ink bg-ink text-paper-3' : 'border-ink/25 text-steel hover:border-ink hover:text-ink'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-6">
        <DataTable
          columns={columns}
          data={data?.data?.listings}
          isLoading={isLoading}
          emptyTitle="No listings match that filter."
          page={
            data?.pagination
              ? { current: page, total: data.pagination.totalPages || 1, onChange: setPage }
              : undefined
          }
        />
      </div>
    </>
  );
}
