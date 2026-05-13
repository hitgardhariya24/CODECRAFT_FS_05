import { useEffect, useState } from 'react';
import { Bookmark, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PostCard from '../components/PostCard';
import Skeleton from '../components/Skeleton';

export default function BookmarksPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookmarks = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get('/users/saved/list');
      setPosts(data.posts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load bookmarks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <div className="page-stack bookmarks-page">
      <div className="feed-toolbar glass-card bookmarks-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Bookmarks</h2>
          <p className="muted">Posts you saved for later will appear here.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadBookmarks} disabled={refreshing}>
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <Skeleton lines={5} />
      ) : posts.length ? (
        <div className="bookmarks-list">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} initialSaved onChanged={loadBookmarks} />
          ))}
        </div>
      ) : (
        <div className="glass-card bookmark-empty-state">
          <Bookmark size={28} />
          <strong>No saved posts yet</strong>
          <p>Tap the bookmark icon on any post to save it here.</p>
        </div>
      )}
    </div>
  );
}
