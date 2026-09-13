// Manages the Socket.io connection lifecycle tied to auth state
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export const useSocket = () => {
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }

    return () => {
      if (!isAuthenticated) disconnectSocket();
    };
  }, [isAuthenticated, token]);

  return getSocket();
};

export default useSocket;
