import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // Empty in production (.env.production): the API and this app share one
  // origin, and io() with no URL connects back to the page's own host.
  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    auth: { token },
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket };
