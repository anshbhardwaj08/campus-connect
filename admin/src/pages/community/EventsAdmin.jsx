// Every campus event, with a moderation override on cancel. `DELETE
// /events/:id` on the student side is organiser-scoped ("call it off" on
// your own event); `DELETE /admin/community/events/:id` is new and has no
// such restriction — the whole point is cancelling someone else's event.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import AdminNavbar from '../../components/layout/AdminNavbar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { formatDateTime, whenRelative } from '../../utils/formatDate';

export default function EventsAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', { page }],
    queryFn: () => adminApi.get('/admin/community/events', { params: { page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const cancel = useMutation({
    mutationFn: (id) => adminApi.delete(`/admin/community/events/${id}`),
    onSuccess: () => {
      toast.success('Event cancelled.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel that event.')),
  });

  const events = data?.data?.events;

  return (
    <>
      <AdminNavbar title="Events" blurb={`${data?.pagination?.total ?? '…'} total.`} />

      <div className="flex flex-col gap-2.5 p-6">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)}

        {!isLoading && !events?.length && (
          <div className="border-2 border-dashed border-ink/25 px-4 py-14 text-center">
            <p className="text-[14px] font-extrabold text-ink">No events yet.</p>
          </div>
        )}

        {events?.map((e) => (
          <div key={e._id} className="flex items-center gap-4 border-[3px] border-ink bg-paper-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-extrabold text-ink">{e.title}</p>
              <p className="meta mt-0.5">
                {e.organizerId?.name} · {formatDateTime(e.date)} · {whenRelative(e.date)}
              </p>
            </div>
            {e.location && <Badge tone="outline">{e.location}</Badge>}
            <Badge tone="ink">{e.rsvpCount} going</Badge>
            <Button
              variant="paper"
              size="sm"
              className="!min-h-[34px] !px-2.5 !text-[12px]"
              disabled={cancel.isPending}
              onClick={() => {
                if (window.confirm(`Cancel "${e.title}"? This cannot be undone.`)) cancel.mutate(e._id);
              }}
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} /> Cancel
            </Button>
          </div>
        ))}

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="mt-2 flex items-center justify-between">
            <Button variant="paper" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="meta">
              Page {page} of {data.pagination.totalPages}
            </span>
            <Button
              variant="paper"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
