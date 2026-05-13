import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const normalizeFollowingIds = useCallback((items = []) => {
    return items
      .map((item) => (typeof item === 'string' ? item : item?._id))
      .filter(Boolean)
      .map((item) => item.toString());
  }, []);

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
      setFollowingIds(normalizeFollowingIds(profileData.user?.following || user?.following || []));
    } finally {
      setLoading(false);
    }
  }, [normalizeFollowingIds, user?.following, user?.username]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setFollowingIds(normalizeFollowingIds(user?.following || []));
  }, [normalizeFollowingIds, user?.following]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewNotification = (notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)]);
    };

    const handleRemovedNotification = ({ notificationId }) => {
      setNotifications((current) => current.filter((item) => item._id !== notificationId));
    };

    const handleRequestStatus = (payload) => {
      if (!payload) return;

      if (payload.status === 'accepted' && payload.targetId) {
        setFollowingIds((current) => (current.includes(payload.targetId) ? current : [...current, payload.targetId]));

        if (user) {
          const alreadyFollowing = normalizeFollowingIds(user.following || []).includes(payload.targetId);
          if (!alreadyFollowing) {
            updateUser({
              ...user,
              following: [...(user.following || []), payload.targetId],
            });
          }
        }
      }

      if (payload.status === 'deleted' && payload.targetId) {
        setFollowingIds((current) => current.filter((id) => id !== payload.targetId));
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:removed', handleRemovedNotification);
    socket.on('follow:request:status', handleRequestStatus);
    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:removed', handleRemovedNotification);
      socket.off('follow:request:status', handleRequestStatus);
    };
  }, [normalizeFollowingIds, socket, updateUser]);

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