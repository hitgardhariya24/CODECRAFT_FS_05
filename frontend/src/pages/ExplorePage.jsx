import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Images,
  Maximize2,
  Search,
  Sparkles,
  Video,
  X,
  ChevronRight,
  Heart,
  MessageCircle,
  ArrowUpRight,
} from 'lucide-react';
import api from '../services/api';
import Skeleton from '../components/Skeleton';
import toast from 'react-hot-toast';

const exploreFilters = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'mixed', label: 'Mixed' },
];

const pageSize = 12;

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const isVideoPost = (post) => post.media?.some((item) => item.type === 'video');
const isCarouselPost = (post) => (post.media?.length || 0) > 1;

const getTileClass = (post, index) => {
  if (isVideoPost(post)) {
    return index % 5 === 0 ? 'tile-large' : index % 3 === 0 ? 'tile-tall' : 'tile-standard';
  }

  if (isCarouselPost(post)) {
    return index % 4 === 1 ? 'tile-wide' : index % 4 === 2 ? 'tile-tall' : 'tile-standard';
  }

  return index % 6 === 0 ? 'tile-large' : index % 2 === 0 ? 'tile-tall' : 'tile-standard';
};

const getMediaPreview = (post) => post.media?.[0]?.url || post.author?.avatar || '/avatar-placeholder.svg';

const formatRelativeTime = (value) => {
  const createdAt = new Date(value).getTime();
  const delta = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(delta / 3600000);
  const days = Math.floor(delta / 86400000);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
};

export default function ExplorePage() {
  const navigate = useNavigate();
  const [feedPosts, setFeedPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState({ users: [], posts: [], hashtags: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const sentinelRef = useRef(null);

  const loadFeed = async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const { data } = await api.get('/feed/explore', { params: { page: nextPage, limit: pageSize } });
      const nextPosts = shuffle(data.posts || []);

      setFeedPosts((current) => (append ? [...current, ...nextPosts] : nextPosts));
      setHasMore(nextPosts.length >= pageSize);
      setPage(nextPage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load explore feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadFeed(1, false);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || !hasMore || loadingMore || searchOpen || searchQuery.trim()) return;
        const nextPage = page + 1;
        await loadFeed(nextPage, true);
      },
      { threshold: 0.18 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loadingMore, searchOpen, searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchState({ users: [], posts: [], hashtags: [] });
        setSearchLoading(false);
        setSearchOpen(false);
        return;
      }

      setSearchLoading(true);
      setSearchOpen(true);

      try {
        const [userRes, postRes, tagRes, suggestionRes] = await Promise.all([
          api.get('/search/users', { params: { q: query } }),
          api.get('/search/posts', { params: { q: query } }),
          api.get('/search/hashtags', { params: { q: query } }),
          api.get('/search/suggestions', { params: { q: query } }),
        ]);

        setSearchState({
          users: suggestionRes.data.suggestions?.users?.length ? suggestionRes.data.suggestions.users : userRes.data.users || [],
          posts: postRes.data.posts || [],
          hashtags: tagRes.data.hashtags || suggestionRes.data.suggestions?.hashtags || [],
        });
      } catch (_error) {
        setSearchState({ users: [], posts: [], hashtags: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const filteredFeed = useMemo(() => {
    if (activeFilter === 'photos') return feedPosts.filter((post) => post.media?.length && !isVideoPost(post));
    if (activeFilter === 'videos') return feedPosts.filter((post) => isVideoPost(post));
    if (activeFilter === 'mixed') return feedPosts.filter((post) => (post.media?.length || 0) > 1);
    return feedPosts;
  }, [feedPosts, activeFilter]);

  const openPostViewer = (post) => {
    setSelectedPost(post);
    setViewerIndex(0);
  };

  const closePostViewer = () => {
    setSelectedPost(null);
    setViewerIndex(0);
  };

  const exploreUsers = searchState.users.length ? searchState.users : [];
  const explorePosts = searchState.posts.length ? searchState.posts : [];

  return (
    <div className="page-stack explore-page">
      <motion.div className="explore-search-container" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <div className="explore-search-wrapper">
          <Search size={20} className="explore-search-icon" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => searchQuery.trim() && setSearchOpen(true)}
            placeholder="Search users, hashtags, posts..."
            className="explore-search-input"
          />
          <AnimatePresence>
            {searchQuery ? (
              <motion.button 
                type="button" 
                className="explore-search-clear"
                onClick={() => setSearchQuery('')} 
                aria-label="Clear search"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.1 }}
              >
                <X size={18} strokeWidth={2} />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {searchQuery ? (
        <motion.div className="w-full mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="w-full bg-gradient-to-br from-slate-800/40 via-slate-850/40 to-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-700/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Live results</p>
                <h3 className="text-lg font-semibold text-slate-100">Matching creators and content</h3>
              </div>
              <motion.button 
                type="button" 
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700/40 rounded-lg transition-all"
                onClick={() => navigate('/search')}
                whileHover={{ scale: 1.05 }}
              >
                Open full search
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 p-6">
              <div className="md:col-span-1">
                <div className="flex items-center justify-between mb-4 px-4">
                  <h4 className="text-sm font-semibold text-slate-200">Profiles</h4>
                  <span className="text-xs text-slate-500">{searchLoading ? 'Searching...' : `${exploreUsers.length} matched`}</span>
                </div>
                <div className="explore-user-list space-y-2">
                  {exploreUsers.length ? (
                    exploreUsers.map((result) => (
                      <Link key={result._id} to={`/profile/${result.username}`} className="explore-user-row group px-4 py-3 rounded-lg hover:bg-slate-700/30 transition-colors flex items-center gap-3 cursor-pointer">
                        <img src={result.avatar || '/avatar-placeholder.svg'} alt={result.username} className="avatar avatar-sm w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0">
                          <strong className="text-sm text-slate-100 block truncate">{result.name}</strong>
                          <p className="text-xs text-slate-500">@{result.username}</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 px-4 py-2">No profile matches yet.</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="flex items-center justify-between mb-4 px-4">
                  <h4 className="text-sm font-semibold text-slate-200">Hashtags</h4>
                  <span className="text-xs text-slate-500">{searchState.hashtags.length}</span>
                </div>
                <div className="chips-row space-y-2 px-4">
                  {searchState.hashtags.length ? searchState.hashtags.map((tag) => (
                    <span key={tag} className="chip inline-block bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-600/30 transition-all cursor-pointer">
                      #{tag}
                    </span>
                  )) : <p className="text-sm text-slate-500">No tags yet.</p>}
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="flex items-center justify-between mb-4 px-4">
                  <h4 className="text-sm font-semibold text-slate-200">Posts</h4>
                  <span className="text-xs text-slate-500">{explorePosts.length}</span>
                </div>
                <div className="explore-post-preview-list space-y-2">
                  {explorePosts.length ? explorePosts.slice(0, 4).map((post) => (
                    <motion.button 
                      key={post._id} 
                      type="button" 
                      className="explore-post-preview w-full group px-4 py-3 rounded-lg hover:bg-slate-700/30 transition-all flex items-center gap-3 cursor-pointer"
                      onClick={() => openPostViewer(post)}
                      whileHover={{ x: 4 }}
                    >
                      <img src={getMediaPreview(post)} alt="post preview" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <strong className="text-sm text-slate-100 block truncate">{post.author?.username}</strong>
                        <p className="text-xs text-slate-500 truncate">{post.text?.slice(0, 72) || 'Trending post'}</p>
                      </div>
                    </motion.button>
                  )) : <p className="text-sm text-slate-500 px-4 py-2">No matching posts.</p>}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      <section className="explore-filter-row flex justify-center w-full mt-8 mb-10">
        {exploreFilters.map((item) => (
          <button key={item.key} type="button" className={activeFilter === item.key ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveFilter(item.key)}>
            {item.label}
          </button>
        ))}
      </section>

      <section className="explore-section-head glass-card mt-2 mb-8">
        <div>
          <p className="eyebrow">Trending feed</p>
          <h2>Explore the latest visual posts</h2>
        </div>
        <div className="explore-feed-meta">
          <Sparkles size={16} />
          <span>{filteredFeed.length} posts</span>
        </div>
      </section>

      {loading ? (
        <Skeleton lines={6} />
      ) : (
        <section className="explore-masonry mt-2" aria-label="Explore feed">
          {filteredFeed.map((post, index) => {
            const tileClass = getTileClass(post, index);
            const firstMedia = post.media?.[0];
            return (
              <motion.article
                key={post._id}
                className={`explore-tile ${tileClass} glass-card`}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.18 }}
                onClick={() => openPostViewer(post)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPostViewer(post);
                  }
                }}
              >
                <div className="explore-tile-press" aria-label="Open post viewer">
                  <div className="explore-media-shell">
                    {firstMedia ? (
                      firstMedia.type === 'video' ? (
                        <video src={firstMedia.url} muted playsInline preload="metadata" className="explore-media" />
                      ) : (
                        <img src={firstMedia.url} alt="explore post" className="explore-media" />
                      )
                    ) : (
                      <div className="explore-text-card">
                        <p>{post.text?.slice(0, 160) || 'Trending post'}</p>
                      </div>
                    )}

                    <div className="explore-media-overlay">
                      <div className="explore-badges">
                        {firstMedia?.type === 'video' ? (
                          <span className="explore-badge">
                            <Video size={14} /> Reels
                          </span>
                        ) : null}
                        {isCarouselPost(post) ? (
                          <span className="explore-badge">
                            <Images size={14} /> {post.media.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="explore-media-actions">
                        <span className="explore-media-time">{formatRelativeTime(post.createdAt)}</span>
                        <span className="explore-media-open"><Maximize2 size={14} /> Open</span>
                      </div>
                    </div>
                  </div>

                  <div className="explore-tile-footer">
                    <Link to={`/profile/${post.author?.username}`} className="explore-author-pill" onClick={(event) => event.stopPropagation()}>
                      <img src={post.author?.avatar || '/avatar-placeholder.svg'} alt={post.author?.username} className="avatar avatar-sm" />
                      <div>
                        <strong>{post.author?.username || 'creator'}</strong>
                        <p>{post.location || 'Trending now'}</p>
                      </div>
                    </Link>
                    <button type="button" className="ghost-btn icon-only explore-view-btn" onClick={(event) => { event.stopPropagation(); openPostViewer(post); }} aria-label="View post">
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </section>
      )}

      <div ref={sentinelRef} className="explore-sentinel mt-8" />
      {loadingMore ? <p className="muted center-text mt-6">Loading more explore posts...</p> : null}
      {!hasMore ? <p className="muted center-text mt-6">You reached the end of explore.</p> : null}

      <AnimatePresence>
        {selectedPost ? (
          <motion.div className="explore-viewer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePostViewer}>
            <motion.div
              className="explore-viewer glass-card"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="explore-viewer-media">
                {selectedPost.media?.length ? (
                  <>
                    {selectedPost.media[viewerIndex]?.type === 'video' ? (
                      <video controls autoPlay playsInline src={selectedPost.media[viewerIndex].url} className="explore-viewer-main" />
                    ) : (
                      <img src={selectedPost.media[viewerIndex].url} alt="selected post" className="explore-viewer-main" />
                    )}

                    {selectedPost.media.length > 1 ? (
                      <div className="explore-viewer-thumbs">
                        {selectedPost.media.map((item, index) => (
                          <button key={item.url} type="button" className={viewerIndex === index ? 'explore-viewer-thumb active' : 'explore-viewer-thumb'} onClick={() => setViewerIndex(index)}>
                            {item.type === 'video' ? <Video size={14} /> : <Images size={14} />}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="explore-viewer-empty">
                    <p>{selectedPost.text}</p>
                  </div>
                )}
              </div>

              <div className="explore-viewer-panel">
                <div className="explore-viewer-head">
                  <Link to={`/profile/${selectedPost.author?.username}`} className="explore-viewer-author">
                    <img src={selectedPost.author?.avatar || '/avatar-placeholder.svg'} alt={selectedPost.author?.username} className="avatar avatar-sm" />
                    <div>
                      <strong>{selectedPost.author?.name}</strong>
                      <p>@{selectedPost.author?.username}</p>
                    </div>
                  </Link>
                  <button type="button" className="ghost-btn icon-only" onClick={closePostViewer} aria-label="Close viewer">
                    <X size={14} />
                  </button>
                </div>

                <div className="explore-viewer-meta">
                  <span className="explore-badge">
                    <Heart size={14} /> {selectedPost.likes?.length || 0}
                  </span>
                  <span className="explore-badge">
                    <MessageCircle size={14} /> {selectedPost.commentsCount || 0}
                  </span>
                  {selectedPost.media?.length > 1 ? <span className="explore-badge"><Images size={14} /> {selectedPost.media.length} media</span> : null}
                </div>

                <p className="explore-viewer-text">{selectedPost.text || 'Trending visual post.'}</p>

                <div className="explore-viewer-actions">
                  <button type="button" className="primary-btn" onClick={() => navigate(`/profile/${selectedPost.author?.username}`)}>
                    Open profile
                  </button>
                  <button type="button" className="ghost-btn" onClick={closePostViewer}>
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
