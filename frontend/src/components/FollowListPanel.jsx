import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import AvatarImage from './AvatarImage';

export default function FollowListPanel({
  open,
  title,
  eyebrow,
  items = [],
  loading,
  searchValue,
  onSearchChange,
  onClose,
  actionLabel,
  actionItemId,
  onAction,
  emptyTitle,
  emptyDescription,
}) {
  const filtered = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const username = (item.username || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      return username.includes(query) || name.includes(query);
    });
  }, [items, searchValue]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="follow-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="follow-panel-drawer glass-card"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="follow-panel-head">
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
              </div>
              <button type="button" className="follow-panel-close" onClick={onClose} aria-label={`Close ${title} panel`}>
                <X size={18} />
              </button>
            </div>

            <label className="follow-panel-search" htmlFor="follow-list-search">
              <Search size={15} />
              <input
                id="follow-list-search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}`}
              />
            </label>

            <div className="follow-panel-list">
              {loading ? (
                <div className="follow-panel-empty">
                  <p>Loading...</p>
                </div>
              ) : filtered.length ? (
                filtered.map((item) => (
                  <div key={item._id} className="follow-panel-row">
                    <Link className="follow-panel-user" to={`/profile/${item.username}`} onClick={onClose}>
                      <AvatarImage src={item.avatar} alt={item.username} className="avatar avatar-sm" />
                      <div>
                        <strong>{item.name || item.username}</strong>
                        <p>@{item.username}</p>
                      </div>
                    </Link>
                    {actionLabel && onAction ? (
                      <button
                        type="button"
                        className="follow-panel-action"
                        onClick={() => onAction(item)}
                        disabled={actionItemId === item._id}
                      >
                        {actionItemId === item._id ? 'Please wait' : actionLabel}
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="follow-panel-empty">
                  <strong>{emptyTitle}</strong>
                  <p>{emptyDescription}</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
