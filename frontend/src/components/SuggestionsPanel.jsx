import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import AvatarImage from "./AvatarImage";
import api from "../services/api";

export default function SuggestionsPanel({ 
  open = false, 
  onClose, 
  suggestions = [], 
  currentUser, 
  currentFollowing = [],
  onFollowUpdate,
  onUnfollowUpdate
}) {
  const [localFollowing, setLocalFollowing] = useState(new Set(currentFollowing));

  // Sync local following state with props
  useEffect(() => {
    setLocalFollowing(new Set(currentFollowing));
  }, [currentFollowing]);

  // Filter suggestions to only show non-followed users
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(
      (item) => !localFollowing.has(item.username) && !localFollowing.has(item._id)
    );
  }, [suggestions, localFollowing]);

  const handleFollow = async (user) => {
    try {
      await api.post(`/users/${user.username}/follow`);
      
      // Update local following state
      const newFollowing = new Set(localFollowing);
      newFollowing.add(user.username);
      newFollowing.add(user._id);
      setLocalFollowing(newFollowing);
      
      toast.success(`Following ${user.username}`);
      onFollowUpdate?.(user.username, user._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not follow user");
    }
  };

  const handleUnfollow = async (user) => {
    try {
      await api.post(`/users/${user.username}/unfollow`);
      
      // Update local following state
      const newFollowing = new Set(localFollowing);
      newFollowing.delete(user.username);
      newFollowing.delete(user._id);
      setLocalFollowing(newFollowing);
      
      toast.success(`Unfollowed ${user.username}`);
      onUnfollowUpdate?.(user.username, user._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not unfollow user");
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
                {filteredSuggestions.length === 0 ? (
                  <div className="suggestions-empty">
                    <p>No suggestions available right now.</p>
                  </div>
                ) : (
                  filteredSuggestions.map((user) => {
                    const isFollowing = localFollowing.has(user.username) || localFollowing.has(user._id);
                    return (
                      <div key={user._id} className="suggestion-card">
                        <Link 
                          to={`/profile/${user.username}`} 
                          className="suggestion-card-content"
                        >
                          <AvatarImage
                            src={user.avatar}
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
                          className={isFollowing ? "follow-btn-modal following" : "follow-btn-modal"}
                          onClick={() => isFollowing ? handleUnfollow(user) : handleFollow(user)}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
