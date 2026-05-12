import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Settings,
  Moon,
  Sun,
  Bookmark,
  Lock,
  LogOut,
  Palette,
  Shield,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function SettingsPanel({ mode = 'drawer', open = true, onClose }) {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      logout();
      onClose?.();
      navigate('/auth');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to logout');
    }
  };

  const updateVisibility = async (profileVisibility) => {
    if (!user || user.profileVisibility === profileVisibility) return;

    setUpdatingVisibility(true);
    try {
      const { data } = await api.patch('/users/profile', { profileVisibility });
      updateUser(data.user);
      toast.success(`Profile set to ${profileVisibility}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile visibility');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const settingsGroups = [
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          label: 'Theme',
          type: 'toggle',
          value: theme === 'dark',
          icon: theme === 'dark' ? Moon : Sun,
          action: toggleTheme,
        },
      ],
    },
    {
      title: 'Content',
      icon: Bookmark,
      items: [
        {
          label: 'Bookmarks',
          type: 'link',
          action: () => {
            navigate('/bookmarks');
            onClose?.();
          },
        },
      ],
    },
    {
      title: 'Account',
      icon: Shield,
      items: [
      ],
    },
  ];

  const currentVisibility = user?.profileVisibility || 'public';

  const content = (
    <>
      <div className="settings-panel-head">
        <div>
          <h2>Settings</h2>
        </div>
        {mode === 'drawer' ? (
          <button type="button" className="ghost-btn icon-only settings-close-btn" onClick={onClose} aria-label="Close settings panel">
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="settings-panel-user">
        <img src={user?.avatar || '/avatar-placeholder.svg'} alt={user?.username} className="avatar avatar-lg" />
        <div>
          <strong>{user?.name || 'User'}</strong>
          <p>@{user?.username || 'username'}</p>
        </div>
      </div>

      <div className="settings-panel-content">
        {settingsGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.title} className="settings-group">
              <div className="settings-group-header">
                <GroupIcon size={16} />
                <h3>{group.title}</h3>
              </div>
              <div className="settings-group-items">
                {group.items.map((item) => {
                  return (
                    <motion.button
                      key={item.label}
                      type="button"
                      className={`settings-item ${item.type}`}
                      onClick={item.action}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.16 }}
                    >
                      <span className="settings-item-label">{item.label}</span>
                      {item.type === 'toggle' ? (
                        <motion.div
                          className={`settings-toggle ${item.value ? 'active' : ''}`}
                          animate={{ backgroundColor: item.value ? '#1d9bf0' : '#334155' }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.span
                            className="settings-toggle-dot"
                            animate={{ x: item.value ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                          />
                        </motion.div>
                      ) : item.type === 'link' ? (
                        <ChevronRight size={16} className="text-slate-500" />
                      ) : null}
                    </motion.button>
                  );
                })}
                {group.title === 'Account' ? (
                  <div className="settings-visibility-card">
                    <div className="settings-visibility-head">
                      <Lock size={16} />
                      <div>
                        <strong>Profile visibility</strong>
                        <p>Choose who can view your profile posts.</p>
                      </div>
                    </div>
                    <div className="grid-2 settings-visibility-options">
                      <button
                        type="button"
                        className={currentVisibility === 'public' ? 'switch-pill active' : 'switch-pill'}
                        onClick={() => updateVisibility('public')}
                        disabled={updatingVisibility}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        className={currentVisibility === 'private' ? 'switch-pill active' : 'switch-pill'}
                        onClick={() => updateVisibility('private')}
                        disabled={updatingVisibility}
                      >
                        Private
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="settings-panel-footer">
        <motion.button
          type="button"
          className="settings-logout-btn"
          onClick={handleLogout}
          whileHover={{ backgroundColor: '#dc2626' }}
          transition={{ duration: 0.2 }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </motion.button>
      </div>
    </>
  );

  if (mode === 'drawer') {
    return (
      <AnimatePresence>
        {open ? (
          <motion.div className="settings-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.aside
              className="settings-drawer glass-card"
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

  return <div className="settings-panel">{content}</div>;
}
