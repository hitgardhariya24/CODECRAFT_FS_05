import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronRight,
  Heart,
  MessageCircle,
  Repeat2,
  AtSign,
  UserPlus,
  Mail,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AvatarImage from './AvatarImage';
import api from '../services/api';
import { getAvatarUrl, getMediaUrl } from '../utils/media';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'following', label: 'People you follow' },
  { key: 'comments', label: 'Comments' },
  { key: 'likes', label: 'Likes' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'follows', label: 'Follows' },
  { key: 'mentions', label: 'Mentions' },
];

const typeMeta = {
  follow: { icon: UserPlus, label: 'followed you', tone: 'follow', filterKey: 'follows' },
  comment: { icon: MessageCircle, label: 'commented on your post', tone: 'comment', filterKey: 'comments' },
  like: { icon: Heart, label: 'liked your post', tone: 'like', filterKey: 'likes' },
  repost: { icon: Repeat2, label: 'reposted your post', tone: 'repost', filterKey: 'reposts' },
  mention: { icon: AtSign, label: 'mentioned you', tone: 'mention', filterKey: 'mentions' },
  message: { icon: Mail, label: 'sent you a message', tone: 'message', filterKey: 'all' },
  story: { icon: Bell, label: 'engaged with your story', tone: 'story', filterKey: 'all' },
  follow_request: { icon: UserPlus, label: 'requested to follow you', tone: 'request', filterKey: 'following' },
  request: { icon: UserPlus, label: 'requested to follow you', tone: 'request', filterKey: 'following' },
  follow_accepted: { icon: Check, label: 'accepted your follow request', tone: 'request', filterKey: 'following' },
};

const formatRelativeTime = (value) => {
  const createdAt = new Date(value).getTime();
  const delta = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(delta / 3600000);
  const days = Math.floor(delta / 86400000);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
};

const getTypeMeta = (notification) => typeMeta[notification.type] || { icon: Bell, label: 'activity update', tone: 'default', filterKey: 'all' };

const getPreviewImage = (notification) => getMediaUrl(notification.post?.media?.[0]?.url) || getAvatarUrl(notification.actor?.avatar) || '/avatar-placeholder.svg';

export default function NotificationPanel({
  mode = 'page',
  open = true,
  onClose,
  notifications = [],
  followingIds = [],
  loading = false,
  onMarkAllRead,
  onMarkRead,
  onRefresh,
}) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const meta = getTypeMeta(notification);
      if (activeFilter === 'all') return true;
      if (activeFilter === 'following') return followingSet.has(notification.actor?._id);
      return meta.filterKey === activeFilter;
    });
  }, [activeFilter, notifications, followingSet]);

  const handleOpenTarget = async (notification) => {
    if (notification._id) {
      await onMarkRead?.(notification._id);
    }

    if (notification.post?._id) {
      navigate(`/profile/${notification.actor?.username || 'profile'}`);
    } else if (notification.actor?.username) {
      navigate(`/profile/${notification.actor.username}`);
    }

    onClose?.();
  };

  const handleFollowBack = async (notification) => {
    try {
      await api.post(`/users/${notification.actor.username}/follow`);
      toast.success(`Following ${notification.actor.username}`);
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not follow user');
    }
  };

  const handleRequestAction = async (action, notification) => {
    try {
      if (action === 'confirm') {
        await api.post(`/users/follow-requests/${notification._id}/accept`);
      } else {
        await api.delete(`/users/follow-requests/${notification._id}`);
      }

      await onMarkRead?.(notification._id);
      toast.success(`${action === 'confirm' ? 'Request accepted' : 'Request deleted'} for ${notification.actor?.username || 'user'}`);
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update request');
    }
  };

  const content = (
    <>
      <div className="notification-panel-head">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Notifications</h2>
        </div>
        {mode === 'drawer' ? (
          <button type="button" className="ghost-btn icon-only notification-close-btn" onClick={onClose} aria-label="Close notifications panel">
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="notification-filter-row">
        {filterOptions.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeFilter === item.key ? 'switch-pill active' : 'switch-pill'}
            onClick={() => setActiveFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="notification-panel-actions">
        <button type="button" className="ghost-btn" onClick={onMarkAllRead}>
          Mark all read
        </button>
        <button type="button" className="ghost-btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="notification-panel-list">
        {loading ? (
          <div className="notification-empty">
            <p>Loading notifications...</p>
          </div>
        ) : visibleNotifications.length ? (
          visibleNotifications.map((notification) => {
            const meta = getTypeMeta(notification);
            const Icon = meta.icon;
            const isPendingRequest = notification.type === 'follow_request' || notification.type === 'request';
            const isAcceptedRequest = notification.type === 'follow_accepted';
            const isRequestThread = isPendingRequest || isAcceptedRequest;
            const isFollowing = followingSet.has(notification.actor?._id);
            const actorName = notification.actor?.name || notification.actor?.username || 'Someone';
            const messageText = notification.text || `${actorName} ${meta.label}`;

            return (
              <motion.article
                key={notification._id}
                className={`notification-card ${notification.read ? 'read' : 'unread'}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.16 }}
                onClick={() => handleOpenTarget(notification)}
              >
                <div className="notification-avatar-wrap">
                  <AvatarImage src={notification.actor?.avatar} alt={notification.actor?.username || 'user'} className="avatar avatar-lg notification-avatar" />
                  {!notification.read ? <span className="notification-unread-dot" /> : null}
                </div>

                <div className="notification-card-main">
                  <div className="notification-card-top">
                    <div className={`notification-icon-badge ${meta.tone}`}>
                      <Icon size={14} strokeWidth={2.4} />
                    </div>
                    {isRequestThread ? (
                      <p className="notification-inline-text">
                        <strong>{actorName}</strong>
                        <span>{isAcceptedRequest ? ' accepted your follow request' : ' requested to follow you'}</span>
                      </p>
                    ) : (
                      <p className="notification-inline-text">{messageText}</p>
                    )}
                    <span className="notification-time">{formatRelativeTime(notification.createdAt)}</span>
                  </div>

                  <div className="notification-card-footer">
                    {isPendingRequest ? (
                      <div className="notification-card-actions notification-request-actions">
                        <button type="button" className="primary-btn notification-action-btn request-action-btn" onClick={(event) => { event.stopPropagation(); handleRequestAction('confirm', notification); }}>
                          Confirm
                        </button>
                        <button type="button" className="ghost-btn notification-action-btn request-action-btn" onClick={(event) => { event.stopPropagation(); handleRequestAction('delete', notification); }}>
                          Delete
                        </button>
                      </div>
                    ) : isAcceptedRequest ? null : (
                      <span className={`notification-type-pill ${meta.tone}`}>{meta.tone === 'default' ? 'Activity' : meta.label.split(' ')[0]}</span>
                    )}

                    {!isRequestThread && notification.type === 'follow' ? (
                      <button
                        type="button"
                        className={isFollowing ? 'ghost-btn notification-action-btn' : 'primary-btn notification-action-btn'}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isFollowing) handleFollowBack(notification);
                        }}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    ) : !isRequestThread ? (
                      <ChevronRight size={16} className="notification-chevron" />
                    ) : null}
                  </div>
                </div>

                {!isRequestThread && notification.type !== 'message' ? (
                  <div className="notification-preview">
                    <img src={getPreviewImage(notification)} alt="preview" />
                  </div>
                ) : null}
              </motion.article>
            );
          })
        ) : (
          <div className="notification-empty">
            <Bell size={22} />
            <strong>No notifications yet</strong>
            <p>New follows, comments, likes, reposts, mentions, and messages will appear here in real time.</p>
          </div>
        )}
      </div>
    </>
  );

  if (mode === 'drawer') {
    return (
      <AnimatePresence>
        {open ? (
          <motion.div className="notification-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.aside
              className="notification-drawer glass-card"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              {content}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  }

  return <section className="notification-page-shell">{content}</section>;
}