import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettingsPanel } from '../context/SettingsContext';
import { motion } from 'framer-motion';
import {
  House,
  Compass,
  Bell,
  MessageCircle,
  UserRound,
  Settings,
} from 'lucide-react';

export default function Sidebar({ unreadCount = 0, onOpenNotifications, className = '' }) {
  const { user } = useAuth();
  const { openPanel } = useSettingsPanel();

  const navItems = [
    { to: '/', label: 'Home', icon: House },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/notifications', label: 'Notifications', icon: Bell, action: onOpenNotifications },
    { to: '/messages', label: 'Chat', icon: MessageCircle },
    { to: `/profile/${user?.username || 'profile'}`, label: 'Profile', icon: UserRound },
    { label: 'Settings', icon: Settings, action: openPanel },
  ];

  return (
    <aside className={`sidebar ${className}`.trim()}>
      <div className="sidebar-brand">
        <span className="brand-mark sidebar-brand-mark">X</span>
        <div>
          <strong>Social Media</strong>
          <p>Timeline</p>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} whileHover={{ x: 4 }} transition={{ duration: 0.16 }}>
              {item.action ? (
                <button type="button" className="nav-link nav-link-button" onClick={item.action}>
                  <span className="nav-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={2.25} />
                    {unreadCount > 0 ? <span className="nav-unread-dot" /> : null}
                  </span>
                  <span>{item.label}</span>
                </button>
              ) : (
                <NavLink key={item.label} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon" aria-hidden="true"><Icon size={18} strokeWidth={2.25} /></span>
                  <span>{item.label}</span>
                </NavLink>
              )}
            </motion.div>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />
    </aside>
  );
}