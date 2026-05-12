import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import SuggestionsPanel from './SuggestionsPanel';

export default function RightRail() {
  const [suggestions, setSuggestions] = useState([]);
  const [following, setFollowing] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

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

  const followSuggestion = async (item) => {
    try {
      await api.post(`/users/${item.username}/follow`);
      setFollowing((current) => (current.includes(item.username) ? current : [...current, item.username]));
      toast.success(`Following ${item.username}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not follow user');
    }
  };

  const handleFollowFromPanel = (username) => {
    setFollowing((current) => (current.includes(username) ? current : [...current, username]));
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
          {suggestions.slice(0, 2).map((item) => (
            <div key={item._id} className="rail-user">
              <Link to={`/profile/${item.username}`} className="rail-user-main">
                <img src={item.avatar || '/avatar-placeholder.svg'} alt={item.username} className="avatar avatar-sm" />
                <div>
                  <strong>{item.name}</strong>
                  <p>@{item.username}</p>
                </div>
              </Link>
              <button className="rail-follow" type="button" onClick={() => followSuggestion(item)}>
                {following.includes(item.username) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <SuggestionsPanel
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        suggestions={suggestions}
        onFollowUpdate={handleFollowFromPanel}
      />
    </aside>
  );
}
