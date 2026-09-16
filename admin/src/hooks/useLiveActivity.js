// Folds `admin:activity` ticks into the cached activity series instead of
// into a counter of their own.
//
// The point is that there is one number, not two. The ticker and the chart
// read the same cache entry, so they cannot drift apart, and a refetch
// overwrites whatever the socket believed — which is how anything missed
// while disconnected gets corrected. A separate local tally would have to
// be reconciled against every refetch, and would double-count the moment
// it got that wrong.

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import useAdminSocket from './useAdminSocket';

const COUNTABLE = ['listings', 'deals', 'users', 'reports'];

export const activityKey = (days) => ['admin', 'stats', 'activity', days];

export default function useLiveActivity(days) {
  const socket = useAdminSocket();
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!socket) return undefined;

    const onActivity = ({ kind }) => {
      if (!COUNTABLE.includes(kind)) return;

      queryClient.setQueryData(activityKey(days), (prev) => {
        if (!prev?.series?.length) return prev;
        // The series always ends on today, so the last bucket is the one a
        // tick belongs to. Left open across midnight it would be yesterday
        // for a moment, until the next refetch rebuilds the window.
        const series = prev.series.slice();
        const last = series[series.length - 1];
        series[series.length - 1] = { ...last, [kind]: last[kind] + 1 };
        return { ...prev, series };
      });

      // The rest of the page would otherwise sit at whatever was true when
      // it loaded, so a moving line would be contradicted by a stale count
      // two inches above it. These have to be refetched rather than patched:
      // a tick says what happened, not which category it was filed under or
      // what it did to the pending queue.
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'], exact: true });
      if (kind === 'listings') {
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats', 'categories'] });
      }
    };

    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);

    socket.on('admin:activity', onActivity);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setLive(socket.connected);

    return () => {
      socket.off('admin:activity', onActivity);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, queryClient, days]);

  return live;
}
