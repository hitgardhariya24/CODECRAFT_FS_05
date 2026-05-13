import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import AvatarImage from './AvatarImage';
import SuggestionsPanel from './SuggestionsPanel';

export default function RightRail() {
  const { user, updateUser } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Get current user's following list (IDs or usernames depending on backend format)
  const currentFollowing = useMemo(() => {
    if (!user?.following) return [];
    // If following contains user objects with usernames, extract usernames
    // If it contains IDs, we'll need to compare with suggestion IDs
    return user.following.map(f => typeof f === 'string' ? f : f.username || f._id || f);
  }, [user?.following]);

  useEffect(() => {
    const load = async () => {
      try {
        const suggestionsRes = await api.get('/users/suggestions');
        setSuggestions(suggestionsRes.data.suggestions || []);
      } catch (_error) {
        setSuggestions([]);
      }
    };
    load();
  }, []);

  // Filter suggestions to exclude already followed users
  const filteredSuggestions = useMemo(() => {
    if (!user) return suggestions;
    return suggestions.filter(
      (item) => !currentFollowing.includes(item.username) && !currentFollowing.includes(item._id)
    );
  }, [suggestions, user, currentFollowing]);

  const followSuggestion = async (item) => {
    try {
      await api.post(`/users/${item.username}/follow`);
      
      // Update user's following list in AuthContext
      const updatedUser = {
        ...user,
        following: [...(user.following || []), item._id]
      };
      updateUser(updatedUser);
      
       // Check for duplicates before updating
       const followingIds = new Set(
         (user.following || []).map(f => typeof f === 'string' ? f : f._id || f)
       );
       if (!followingIds.has(item._id)) {
         const updatedUser = {
           ...user,
           following: [...(user.following || []), item._id]
         };
         updateUser(updatedUser);
       }
       
       // Remove from suggestions list
       setSuggestions((current) => current.filter((s) => s._id !== item._id));
      
      toast.success(`Following ${item.username}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not follow user');
    }
  };

  const unfollowSuggestion = async (item) => {
    try {
      await api.post(`/users/${item.username}/unfollow`);
      
      // Update user's following list in AuthContext
      const updatedUser = {
        ...user,
        following: (user.following || []).filter(
          (f) => (typeof f === 'string' ? f : f._id) !== item._id
        )
      };
      updateUser(updatedUser);
      
      // Add back to suggestions list
      setSuggestions((current) => [...current, item]);
      
      toast.success(`Unfollowed ${item.username}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not unfollow user');
    }
  };

  const handleFollowFromPanel = (username, userId) => {
    // Remove from main suggestions
    setSuggestions((current) => current.filter((s) => s.username !== username));
    
    // Update AuthContext
    const updatedUser = {
      ...user,
      following: [...(user.following || []), userId]
    };
    updateUser(updatedUser);
  };

  const handleUnfollowFromPanel = (username, userId) => {
    // Add back to suggestions
    const unfollowedUser = suggestions.find((s) => s.username === username);
    if (unfollowedUser) {
      setSuggestions((current) => [...current, unfollowedUser]);
    }
    
    // Update AuthContext
    const updatedUser = {
      ...user,
      following: (user.following || []).filter(
        (f) => (typeof f === 'string' ? f : f._id) !== userId
      )
    };
    updateUser(updatedUser);
  };

  return (
    <aside className="right-rail">
      {/* Search removed per design - keep only suggested accounts */}

      <section className="rail-card rail-card-gradient">
        <div className="rail-title-row">
          <div>
            <p className="eyebrow">What to follow</p>
            <h3>Suggested accounts</h3>
          </div>
          <button
            type="button"
            className="view-more-btn"
            onClick={() => setSuggestionsOpen(true)}
          >
            View more
          </button>
        </div>
        <div className="rail-list">
          {filteredSuggestions.slice(0, 2).map((item) => {
            const isFollowing = currentFollowing.includes(item.username) || currentFollowing.includes(item._id);
            return (
              <div key={item._id} className="rail-user">
                <Link to={`/profile/${item.username}`} className="rail-user-main">
                  <AvatarImage src={item.avatar} alt={item.username} className="avatar avatar-sm" />
                  <div>
                    <strong>{item.name}</strong>
                    <p>@{item.username}</p>
                  </div>
                </Link>
                <button 
                  className={isFollowing ? "rail-follow following" : "rail-follow"} 
                  type="button" 
                  onClick={() => isFollowing ? unfollowSuggestion(item) : followSuggestion(item)}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <SuggestionsPanel
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        suggestions={filteredSuggestions}
        currentUser={user}
        currentFollowing={currentFollowing}
        onFollowUpdate={handleFollowFromPanel}
        onUnfollowUpdate={handleUnfollowFromPanel}
      />
    </aside>
  );
}
