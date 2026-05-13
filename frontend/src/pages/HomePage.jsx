import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Smile, MapPin, X, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import Skeleton from '../components/Skeleton';
import CreatePostModal from '../components/CreatePostModal';
import AvatarImage from '../components/AvatarImage';
import toast from 'react-hot-toast';

const tabs = [
  { key: 'home', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'trending', label: 'Trending Now' },
];

const emojiOptions = ['😀', '😂', '😍', '🔥', '🎉', '🙏', '💡', '✨'];
const locationOptions = ['Delhi', 'Mumbai', 'Gujarat', 'New York', 'London', 'Los Angeles', 'Tokyo', 'Dubai'];

export default function HomePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [composer, setComposer] = useState({ text: '', hashtags: '', taggedUsers: '', location: '' });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreview, setMediaPreview] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const sentinelRef = useRef(null);

  const appendComposerText = (text) => {
    setComposer((current) => ({
      ...current,
      text: current.text ? `${current.text} ${text}` : text,
    }));
  };

  const appendLocation = (location) => {
    const locationTag = `📍 ${location}`;
    setComposer((current) => {
      const cleanedText = current.text.replace(/\n?📍\s*[^\n]*$/u, '').trimEnd();
      return {
        ...current,
        location,
        text: cleanedText ? `${cleanedText}\n${locationTag}` : locationTag,
      };
    });
    setLocationOpen(false);
    setCustomLocation('');
  };

  const removeLocation = () => {
    setComposer((current) => ({
      ...current,
      location: '',
      text: current.text.replace(/\n?📍\s*[^\n]*$/u, '').trimEnd(),
    }));
    setCustomLocation('');
  };

  const searchGoogleMaps = () => {
    const query = (customLocation || composer.location || '').trim();
    const mapsUrl = query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : 'https://www.google.com/maps';

    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    toast('Pick a location in Google Maps, then paste the place name here to add it to the caption.');
  };

  const chooseEmoji = (emoji) => {
    appendComposerText(emoji);
    setEmojiOpen(false);
  };

  const openComposer = (message) => {
    setCreateOpen(true);
    if (message) toast(message);
  };

  const endpoint = useMemo(() => {
    if (tab === 'following') return '/feed/following';
    if (tab === 'trending') return '/feed/explore';
    return '/feed/home';
  }, [tab]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPage(1);
      const { data } = await api.get(endpoint, { params: { page: 1, limit: 8 } });
      setPosts(data.posts || []);
      setHasMore((data.posts || []).length >= 8);
      setLoading(false);
    };
    load();
  }, [endpoint]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || !hasMore || loading) return;
        const nextPage = page + 1;
        const { data } = await api.get(endpoint, { params: { page: nextPage, limit: 8 } });
        const nextPosts = data.posts || [];
        setPosts((current) => [...current, ...nextPosts]);
        setPage(nextPage);
        setHasMore(nextPosts.length >= 8);
      },
      { threshold: 0.2 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [endpoint, page, hasMore, loading]);

  const submitPost = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('text', composer.text);
    formData.append('hashtags', composer.hashtags);
    formData.append('taggedUsers', composer.taggedUsers);
    formData.append('location', composer.location);
    mediaFiles.forEach((file) => formData.append('media', file));
    const { data } = await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setPosts((current) => [data.post, ...current]);
    setComposer({ text: '', hashtags: '', taggedUsers: '', location: '' });
    setMediaFiles([]);
    setMediaPreview([]);
    setCreateOpen(false);
    toast.success('Post published');
  };

  const postQuick = async () => {
    if (!composer.text.trim()) return;
    const formData = new FormData();
    formData.append('text', composer.text);
    formData.append('location', composer.location);
    const { data } = await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setPosts((current) => [data.post, ...current]);
    setComposer((current) => ({ ...current, text: '' }));
    toast.success('Post published');
  };

  return (
    <div className="feed-shell">
      <div className="feed-toolbar glass-card">
        <div className="tab-row tab-pills x-tabs">
          {tabs.map((item) => (
            <button key={item.key} className={tab === item.key ? 'switch-pill active' : 'switch-pill'} onClick={() => setTab(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
{tab !== 'trending' && (
        <>
          <section className="composer-card glass-card x-composer">
            <div className="x-composer-head">
              <AvatarImage src={user?.avatar} alt="me" className="avatar" />
              <textarea
                rows={3}
                value={composer.text}
                onChange={(event) => setComposer((current) => ({ ...current, text: event.target.value }))}
                placeholder="What is happening?"
              />
            </div>
            <div className="x-composer-foot">
              <div className="x-composer-tools">
                  <button type="button" className="ghost-btn icon-only" onClick={() => openComposer('Open the full composer to add media')}><ImagePlus size={18} /></button>
                  <button type="button" className={emojiOpen ? 'ghost-btn icon-only active' : 'ghost-btn icon-only'} onClick={() => { setLocationOpen(false); setEmojiOpen((current) => !current); }}><Smile size={18} /></button>
                  <button type="button" className={locationOpen ? 'ghost-btn icon-only active' : 'ghost-btn icon-only'} onClick={() => { setEmojiOpen(false); setLocationOpen((current) => !current); }}><MapPin size={18} /></button>
              </div>
              <button className="primary-btn" onClick={postQuick}>Post</button>
            </div>

            <AnimatePresence>
              {emojiOpen ? (
                <motion.div className="emoji-picker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <div className="emoji-picker-header">
                    <span>Choose an emoji</span>
                    <button type="button" className="ghost-btn icon-only" onClick={() => setEmojiOpen(false)} aria-label="Close emoji picker"><X size={14} /></button>
                  </div>
                  <div className="emoji-grid">
                    {emojiOptions.map((emoji) => (
                      <button key={emoji} type="button" className="emoji-option" onClick={() => chooseEmoji(emoji)}>{emoji}</button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {locationOpen ? (
              <div className="composer-location-panel">
                <div className="composer-location-head">
                  <span>Choose a place</span>
                  <button type="button" className="ghost-btn icon-only" onClick={() => setLocationOpen(false)} aria-label="Close location picker">
                    <X size={14} />
                  </button>
                </div>
                <div className="location-chip-row">
                  {locationOptions.map((location) => (
                    <button key={location} type="button" className={composer.location === location ? 'location-chip active' : 'location-chip'} onClick={() => appendLocation(location)}>
                      {location}
                    </button>
                  ))}
                </div>
                <div className="composer-location-row">
                  <input
                    value={customLocation}
                    onChange={(event) => setCustomLocation(event.target.value)}
                    placeholder="Search a place or paste one from Google Maps"
                  />
                  <button type="button" className="ghost-btn location-action-btn" onClick={searchGoogleMaps}>
                    <ExternalLink size={14} />
                    Open Maps
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => appendLocation(customLocation.trim() || composer.location.trim() || 'Your location')}
                  >
                    Add
                  </button>
                  <button type="button" className="ghost-btn" onClick={removeLocation}>
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}

      {loading ? <Skeleton lines={5} /> : posts.map((post) => <PostCard key={post._id} post={post} onChanged={() => {}} />)}
      <div ref={sentinelRef} className="sentinel" />
      {!hasMore ? <p className="muted center-text">No more posts to load.</p> : null}

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitPost}
        form={composer}
        setForm={setComposer}
        mediaPreview={mediaPreview}
        setMediaFiles={setMediaFiles}
        setMediaPreview={setMediaPreview}
      />
    </div>
  );
}