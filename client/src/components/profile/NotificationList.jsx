// The bell's actual contents. Reads from the server rather than the Redux
// slice, because the slice only holds what arrived live on this socket
// connection — anything from before you opened the tab is only on the server.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';

import api from '../../services/api';
import Skeleton from '../ui/Skeleton';
import Button from '../ui/Button';
import { timeAgo } from '../../utils/timeAgo';

export default function NotificationList() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data.notifications),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <p className="meta border-l-[3px] border-ink/20 pl-3 leading-relaxed">
        Nothing yet. Messages and offers land here.
      </p>
    );
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-2">
      {unread > 0 && (
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-2">
          <span className="label-xs">{unread} unread</span>
          <Button variant="link" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={3} /> Mark all read
          </Button>
        </div>
      )}

      {notifications.map((n) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-2">
              {/* Unread is carried by weight and a marker, not by colour. */}
              <span className={`text-[13px] ${n.read ? 'font-semibold text-steel' : 'font-extrabold text-ink'}`}>
                {!n.read && <span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 bg-ink align-middle" />}
                {n.title}
              </span>
              <span className="meta shrink-0">{timeAgo(n.createdAt)}</span>
            </div>
            {n.message && (
              <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-ink/75">
                {n.message}
              </p>
            )}
          </>
        );

        return (
          <div key={n._id} className="border-b-2 border-ink/10 pb-2 last:border-b-0 last:pb-0">
            {n.link ? (
              <Link to={n.link} onClick={() => !n.read && markOneRead.mutate(n._id)} className="block">
                {body}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => !n.read && markOneRead.mutate(n._id)}
                className="block w-full text-left"
              >
                {body}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
