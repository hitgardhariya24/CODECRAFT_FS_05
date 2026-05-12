import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export const useSocket = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const connection = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { userId: user?._id },
      autoConnect: Boolean(user),
      transports: ['websocket'],
    });

    setSocket(connection);

    return () => connection.disconnect();
  }, [user?._id]);

  return useMemo(() => socket, [socket]);
};