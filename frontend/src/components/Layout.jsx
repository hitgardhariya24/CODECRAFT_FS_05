import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightRail from './RightRail';
import NotificationPanel from './NotificationPanel';
import SettingsPanel from './SettingsPanel';
import { NotificationProvider, useNotificationsPanel } from '../context/NotificationContext';
import { SettingsProvider, useSettingsPanel } from '../context/SettingsContext';

const Shell = () => {
  const notifications = useNotificationsPanel();
  const settings = useSettingsPanel();
  const location = useLocation();
  const isExplorePage = location.pathname.startsWith('/explore');
  const isMessagesPage = location.pathname.startsWith('/messages');
  const isProfilePage = location.pathname.startsWith('/profile/');
  const shellClassName = isExplorePage
    ? 'app-body app-body-explore'
    : isMessagesPage
      ? 'app-body app-body-messages'
      : isProfilePage
        ? 'app-body app-body-profile'
      : 'app-body';

  return (
    <div className="app-shell">
      <div className={shellClassName}>
        <Sidebar
          unreadCount={notifications.unreadCount}
          onOpenNotifications={notifications.openDrawer}
          className={isExplorePage ? 'mt-4 sm:mt-5 lg:mt-6' : ''}
        />
        <main className="app-main">
          <Outlet />
        </main>
        {!isExplorePage && !isMessagesPage && !isProfilePage ? <RightRail /> : null}
      </div>

      <NotificationPanel
        mode="drawer"
        open={notifications.drawerOpen}
        onClose={notifications.closeDrawer}
        notifications={notifications.notifications}
        followingIds={notifications.followingIds}
        loading={notifications.loading}
        onMarkAllRead={notifications.markAllRead}
        onMarkRead={notifications.markRead}
        onRefresh={notifications.refresh}
      />

      <SettingsPanel
        mode="drawer"
        open={settings.panelOpen}
        onClose={settings.closePanel}
      />
    </div>
  );
};

export default function Layout() {
  return (
    <NotificationProvider>
      <SettingsProvider>
        <Shell />
      </SettingsProvider>
    </NotificationProvider>
  );
}