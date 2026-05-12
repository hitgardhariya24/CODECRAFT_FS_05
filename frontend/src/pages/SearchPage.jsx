import { useEffect, useState } from 'react';
import api from '../services/api';
import PostCard from '../components/PostCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [suggestions, setSuggestions] = useState({ users: [], posts: [], hashtags: [] });

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!query.trim()) return;
      const [userRes, postRes, tagRes, suggestionRes] = await Promise.all([
        api.get('/search/users', { params: { q: query } }),
        api.get('/search/posts', { params: { q: query } }),
        api.get('/search/hashtags', { params: { q: query } }),
        api.get('/search/suggestions', { params: { q: query } }),
      ]);
      setUsers(userRes.data.users || []);
      setPosts(postRes.data.posts || []);
      setHashtags(tagRes.data.hashtags || []);
      setSuggestions(suggestionRes.data.suggestions || { users: [], posts: [], hashtags: [] });
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="page-stack">
      <section className="feed-hero glass-card">
        <div>
          <p className="eyebrow">Search</p>
          <h1>Find people, posts, and trending hashtags.</h1>
          <p>Premium discovery with smooth suggestions and clean search results.</p>
        </div>
      </section>

      <section className="composer-card glass-card">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, posts, hashtags" />
      </section>

      {query ? (
        <>
          <section className="panel-card glass-card">
            <h3>Suggested users</h3>
            <div className="search-list">
              {users.map((user) => <div key={user._id} className="search-row"><span>{user.name}</span><small>@{user.username}</small></div>)}
            </div>
          </section>
          <section className="panel-card glass-card">
            <h3>Hashtags</h3>
            <div className="chips-row">{hashtags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}</div>
          </section>
          {posts.map((post) => <PostCard key={post._id} post={post} />)}
        </>
      ) : (
        <section className="panel-card glass-card">
          <h3>Suggestions</h3>
          <p className="muted">Start typing to search users, posts, and hashtags.</p>
        </section>
      )}
    </div>
  );
}