import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.username) {
      setNotifications([]);
      setFollowingIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: notificationData }, { data: profileData }] = await Promise.all([
        api.get('/notifications'),
        api.get(`/users/${user.username}`),
      ]);

      setNotifications(notificationData.notifications || []);
      setFollowingIds((profileData.user?.following || []).map((item) => item._id).filter(Boolean));
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewNotification = (notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)]);
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  const markAllRead = useCallback(async () => {
    if (!notifications.length) return;
    await api.patch('/notifications/read-all');
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, [notifications.length]);

  const markRead = useCallback(async (notificationId) => {
    await api.patch(`/notifications/${notificationId}/read`);
    setNotifications((current) => current.map((item) => (item._id === notificationId ? { ...item, read: true } : item)));
  }, []);

  const openDrawer = useCallback(async () => {
    setDrawerOpen(true);
    await markAllRead();
  }, [markAllRead]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      followingIds,
      loading,
      unreadCount,
      drawerOpen,
      openDrawer,
      closeDrawer,
      markAllRead,
      markRead,
      refresh: loadNotifications,
      setNotifications,
    }),
    [
      notifications,
      followingIds,
      loading,
      unreadCount,
      drawerOpen,
      openDrawer,
      closeDrawer,
      markAllRead,
      markRead,
      loadNotifications,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationsPanel = () => useContext(NotificationContext);