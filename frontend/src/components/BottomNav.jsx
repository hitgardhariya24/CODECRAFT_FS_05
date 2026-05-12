import { NavLink } from 'react-router-dom';
import { House, Compass, Bell, MessageCircle, UserRound } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const items = [
  { to: '/', label: 'Home', icon: House },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/messages', label: 'Chat', icon: MessageCircle },
];

export default function BottomNav() {
  const { user } = useAuth();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span><item.icon size={16} strokeWidth={2.3} /></span>
          <small>{item.label}</small>
        </NavLink>
      ))}
      {user ? (
        <NavLink to={`/profile/${user.username}`} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span><UserRound size={16} strokeWidth={2.3} /></span>
          <small>Profile</small>
        </NavLink>
      ) : null}
    </nav>
  );
}
