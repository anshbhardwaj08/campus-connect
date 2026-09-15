// Live notifications: keeps the store in sync AND puts a toast on screen.
//
// Depends on `isAuthenticated` deliberately. The socket does not exist on
// first mount — the session is restored asynchronously, and useSocket only
// connects once that lands. An effect keyed on [dispatch] alone would run
// once against a null socket and never subscribe to anything.
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getSocket } from '../services/socket';
import { addNotification } from '../store/slices/notifSlice';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNew = (notification) => {
      dispatch(addNotification(notification));

      // The inbox and the masthead badge both read from the server, so they
      // need to know something changed.
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Don't interrupt someone who is already reading the thread the
      // message belongs to — they can see it arrive.
      const alreadyLooking =
        notification.link &&
        location.pathname === '/chat' &&
        notification.link.includes(location.search.replace('?', ''));
      if (alreadyLooking) return;

      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? { label: 'Open', onClick: () => navigate(notification.link) }
          : undefined,
      });
    };

    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, [dispatch, isAuthenticated, queryClient, navigate, location.pathname, location.search]);
};

export default useNotifications;
