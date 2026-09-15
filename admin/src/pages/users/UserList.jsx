// Every account on the marketplace. Search and pagination both hit the
// server (`GET /admin/users?search=&page=`), not client-side filtering —
// this list is meant to grow past what one page can hold.
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import AdminNavbar from '../../components/layout/AdminNavbar';
import DataTable from '../../components/tables/DataTable';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { timeAgo } from '../../utils/timeAgo';

const ROLE_TONE = { admin: 'crimson', moderator: 'ink', student: 'outline' };

export default function UserList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search, page }],
    queryFn: () =>
      adminApi
        .get('/admin/users', { params: { search: search || undefined, page, limit: 20 } })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const setBlocked = useMutation({
    mutationFn: ({ id, blocked }) => adminApi.patch(`/admin/users/${id}/${blocked ? 'ban' : 'unban'}`),
    onSuccess: (_res, vars) => {
      toast.success(vars.blocked ? 'User banned.' : 'User unbanned.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update that user.')),
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'User',
        sortable: true,
        sortValue: (row) => row.name,
        render: (row) => (
          <button
            type="button"
            onClick={() => navigate(`/users/${row._id}`)}
            className="flex items-center gap-2.5 text-left"
          >
            <Avatar name={row.name} src={row.avatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-extrabold leading-tight text-ink">{row.name}</p>
              <p className="truncate text-[11px] font-semibold leading-tight text-steel">{row.collegeEmail}</p>
            </div>
          </button>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        sortable: true,
        sortValue: (row) => row.role,
        render: (row) => <Badge tone={ROLE_TONE[row.role] || 'paper'}>{row.role}</Badge>,
      },
      { key: 'trustScore', header: 'Trust', sortable: true, sortValue: (row) => row.trustScore },
      { key: 'dealsCompleted', header: 'Deals', sortable: true, sortValue: (row) => row.dealsCompleted },
      {
        key: 'createdAt',
        header: 'Joined',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        render: (row) => <span className="text-steel">{timeAgo(row.createdAt)}</span>,
      },
      {
        key: 'isBlocked',
        header: 'Status',
        render: (row) => (row.isBlocked ? <Badge tone="crimson">Blocked</Badge> : <Badge tone="ink">Active</Badge>),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <Button
            variant={row.isBlocked ? 'ink' : 'paper'}
            size="sm"
            className="!min-h-[34px] !px-2.5 !text-[12px]"
            disabled={setBlocked.isPending}
            onClick={() => setBlocked.mutate({ id: row._id, blocked: !row.isBlocked })}
          >
            {row.isBlocked ? 'Unban' : 'Ban'}
          </Button>
        ),
      },
    ],
    [navigate, setBlocked]
  );

  return (
    <>
      <AdminNavbar title="Users" blurb={`${data?.pagination?.total ?? '…'} accounts registered.`} />

      <div className="p-6">
        <DataTable
          columns={columns}
          data={data?.data?.users}
          isLoading={isLoading}
          emptyTitle="No users match that search."
          search={{
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            placeholder: 'Search name or email',
          }}
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
