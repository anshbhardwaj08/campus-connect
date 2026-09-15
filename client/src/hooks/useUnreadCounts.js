// The two numbers on the masthead: unread chats and unread notifications.
//
// Both come from the server rather than from Redux. The `notif` slice only
// holds what arrived live on this socket connection, so after a refresh it
// is empty and the bell read zero even with twenty unread notifications
// waiting — the chat badge had the same problem from the other direction
// (nothing ever dispatched `setUnreadCount` at all).
//
// These share query keys with the pages that render the same data
// (`NotificationList`, `ChatPage`), so the cache is warm and a live
// `notification:new` invalidating those keys updates the badges too.
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import api from '../services/api';

export const useUnreadCounts = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const { data: conversations } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data.data.conversations),
    enabled: isAuthenticated,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data.notifications),
    enabled: isAuthenticated,
  });

  return {
    chats: (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    notifications: (notifications || []).filter((n) => !n.read).length,
  };
};

export default useUnreadCounts;
