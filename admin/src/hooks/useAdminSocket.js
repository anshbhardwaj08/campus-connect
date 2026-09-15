// Manages a Socket.io connection for live admin stats/notifications.
// Not wired up yet — nothing in the moderation build needs it. Left correct
// (cookie session, same as /client's useSocket) for whoever builds the
// dashboard ticker next.
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

export const useAdminSocket = () => {
  const { isAuthenticated } = useSelector((state) => state.adminAuth);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        withCredentials: true,
      });
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  return socketRef.current;
};

export default useAdminSocket;
