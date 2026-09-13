// Subscribes to socket notification events and syncs them into Redux
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getSocket } from '../services/socket';
import { addNotification } from '../store/slices/notifSlice';

export const useNotifications = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (notification) => dispatch(addNotification(notification));
    socket.on('notification:new', handleNew);

    return () => socket.off('notification:new', handleNew);
  }, [dispatch]);
};

export default useNotifications;
