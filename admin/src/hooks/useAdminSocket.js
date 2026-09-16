// Socket.io connection for the admin panel, tied to the session.
//
// Held in state rather than a ref: a ref assignment does not re-render, so
// a consumer calling this on mount would read null and never hear that the
// socket had arrived. State makes the connection observable.
//
// Auth rides on the accessToken cookie (withCredentials), the same way
// every other admin request does — there is no token in memory to pass.
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

export const useAdminSocket = () => {
  const { isAuthenticated } = useSelector((state) => state.adminAuth);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const connection = io(import.meta.env.VITE_SOCKET_URL, { withCredentials: true });
    setSocket(connection);

    return () => {
      connection.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated]);

  return socket;
};

export default useAdminSocket;
