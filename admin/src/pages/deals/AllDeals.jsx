// Every handshake on the marketplace. `GET /admin/deals` didn't exist
// before this page — see server/src/controllers/admin.controller.js.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import adminApi from '../../services/adminApi';
import AdminNavbar from '../../components/layout/AdminNavbar';
import DataTable from '../../components/tables/DataTable';
import Badge from '../../components/ui/Badge';
import formatPrice from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';

const STATUSES = ['', 'pending', 'verified', 'completed', 'disputed'];
const STATUS_TONE = { pending: 'outline', verified: 'cold', completed: 'ink', disputed: 'crimson' };

export default function AllDeals() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'deals', 'all', { status, page }],
    queryFn: () =>
      adminApi.get('/admin/deals', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const columns = useMemo(
    () => [
      {
        key: 'listingId',
        header: 'Listing',
        render: (row) => (
          <span className="truncate font-extrabold text-ink">{row.listingId?.title || 'Listing removed'}</span>
        ),
      },
      { key: 'buyerId', header: 'Buyer', render: (row) => row.buyerId?.name },
      { key: 'sellerId', header: 'Seller', render: (row) => row.sellerId?.name },
      {
        key: 'finalPrice',
        header: 'Price',
        sortable: true,
        sortValue: (row) => row.finalPrice,
        render: (row) => formatPrice(row.finalPrice),
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
        header: 'Opened',
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
        title="Deals"
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
          data={data?.data?.deals}
          isLoading={isLoading}
          emptyTitle="No deals match that filter."
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
