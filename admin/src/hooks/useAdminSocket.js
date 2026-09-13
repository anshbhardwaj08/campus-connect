// Manages a Socket.io connection for live admin stats/notifications
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

export const useAdminSocket = () => {
  const { isAuthenticated, token } = useSelector((state) => state.adminAuth);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token },
        withCredentials: true,
      });
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);

  return socketRef.current;
};

export default useAdminSocket;
