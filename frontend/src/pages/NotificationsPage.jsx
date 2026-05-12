import { useEffect } from 'react';
import { useNotificationsPanel } from '../context/NotificationContext';
import NotificationPanel from '../components/NotificationPanel';

export default function NotificationsPage() {
  const { markAllRead, notifications, followingIds, loading, markRead, refresh } = useNotificationsPanel();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <NotificationPanel
      mode="page"
      notifications={notifications}
      followingIds={followingIds}
      loading={loading}
      onMarkAllRead={markAllRead}
      onMarkRead={markRead}
      onRefresh={refresh}
    />
  );
}