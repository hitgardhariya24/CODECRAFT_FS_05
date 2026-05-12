import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

export default function SuggestionsPanel({ open = false, onClose, suggestions = [], onFollowUpdate }) {
  const handleFollow = async (user) => {
    try {
      await api.post(`/users/${user.username}/follow`);
      toast.success(`Following ${user.username}`);
      onFollowUpdate?.(user.username);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not follow user");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="suggestions-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="suggestions-modal-wrapper"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="suggestions-modal">
              <div className="suggestions-modal-head">
                <div className="suggestions-modal-title">
                  <p className="eyebrow">Discover</p>
                  <h2>Suggested Accounts</h2>
                </div>
                <button
                  type="button"
                  className="suggestions-close-btn"
                  onClick={onClose}
                  aria-label="Close suggestions panel"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="suggestions-modal-list">
                {suggestions.length === 0 ? (
                  <div className="suggestions-empty">
                    <p>No suggestions available right now.</p>
                  </div>
                ) : (
                  suggestions.map((user) => (
                    <div key={user._id} className="suggestion-card">
                      <Link 
                        to={`/profile/${user.username}`} 
                        className="suggestion-card-content"
                      >
                        <img
                          src={user.avatar || "/avatar-placeholder.svg"}
                          alt={user.username}
                          className="suggestion-avatar"
                        />
                        <div className="suggestion-text">
                          <div className="suggestion-header">
                            <strong className="suggestion-name">{user.name || user.username}</strong>
                          </div>
                          <p className="suggestion-username">@{user.username}</p>
                          {user.bio && (
                            <p className="suggestion-bio">{user.bio}</p>
                          )}
                        </div>
                      </Link>
                      <button
                        type="button"
                        className="follow-btn-modal"
                        onClick={() => handleFollow(user)}
                      >
                        Follow
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
