import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Heart, MessageCircle, Repeat2, Share, BadgeCheck, Trash2, Link2, Users, X, Send } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PostCard({ post, onChanged }) {
  const { user } = useAuth();
  const commentInputRef = useRef(null);
  const menuRef = useRef(null);
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(Boolean(post.likes?.includes(user?._id)));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTab, setShareTab] = useState('following');
  const [shareUsers, setShareUsers] = useState({ following: [], followers: [] });
  const [shareLoading, setShareLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const verified = Boolean(post.author?.verified || post.author?.isVerified);
  const isOwnPost = post.author?.username === user?.username;

  const authorInitial = useMemo(() => post.author?.name?.slice(0, 1)?.toUpperCase() || 'U', [post.author]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadShareUsers = async () => {
      if (!shareOpen || !user?.username) return;

      setShareLoading(true);
      try {
        const [followingRes, followersRes] = await Promise.all([
          api.get(`/users/${user.username}/following`),
          api.get(`/users/${user.username}/followers`),
        ]);

        setShareUsers({
          following: followingRes.data.following || [],
          followers: followersRes.data.followers || [],
        });
      } catch (_error) {
        toast.error('Could not load share targets');
      } finally {
        setShareLoading(false);
      }
    };

    loadShareUsers();
  }, [shareOpen, user?.username]);

  const toggleLike = async () => {
    const { data } = await api.post(`/posts/${post._id}/like`);
    setLiked(data.liked);
    setLikesCount(data.likesCount);
    onChanged?.();
  };

  const focusComment = () => {
    commentInputRef.current?.focus();
    commentInputRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    toast('Comment box ready');
  };

  const handleMoreActions = () => {
    setMenuOpen((current) => !current);
  };

  const copyPostLink = async () => {
    const link = `${window.location.origin}?post=${post._id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Post link copied');
    } catch (_error) {
      toast.error('Could not copy link');
    }
    setMenuOpen(false);
  };

  const deletePost = async () => {
    if (!window.confirm('Delete this post?')) return;

    setDeleting(true);
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete post');
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  const repostPost = () => {
    toast.success('Repost saved to drafts');
  };

  const sharePost = async () => {
    setMenuOpen(false);
    setShareOpen(true);
  };

  const sendPostToUser = async (recipient) => {
    try {
      const { data } = await api.post('/chats/conversations', { recipientId: recipient._id });
      const postLink = `${window.location.origin}?post=${post._id}`;
      const message = [
        `Shared a post from @${post.author?.username || 'someone'}`,
        post.text ? post.text : null,
        post.location ? `📍 ${post.location}` : null,
        postLink,
      ]
        .filter(Boolean)
        .join('\n');

      await api.post(`/chats/conversations/${data.conversation._id}/messages`, { text: message });
      toast.success(`Shared with ${recipient.username}`);
      setShareOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not share post');
    }
  };

  const shareList = shareTab === 'followers' ? shareUsers.followers : shareUsers.following;

  const toggleSave = () => {
    setSaved((current) => {
      const next = !current;
      toast.success(next ? 'Post saved' : 'Removed from saved');
      return next;
    });
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/posts/${post._id}/comments`, { text: comment });
    setComment('');
    toast.success('Comment added');
    onChanged?.();
  };

  return (
    <motion.article className="post-card glass-card" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <div className="post-head">
        {post.author?.avatar ? (
          <img src={post.author.avatar} alt="author" className="avatar" />
        ) : (
          <div className="avatar avatar-fallback">{authorInitial}</div>
        )}
        <div className="post-meta">
          <strong>
            {post.author?.name}
            {verified ? <BadgeCheck size={16} className="verified-icon" /> : null}
          </strong>
          <p>@{post.author?.username} · {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
        </div>
        <button className="icon-btn" type="button" aria-label="More actions" onClick={handleMoreActions}>⋯</button>

        {menuOpen ? (
          <div ref={menuRef} className="post-menu">
            <button type="button" className="post-menu-item" onClick={sharePost}>
              <Users size={15} />
              Share to friend
            </button>
            <button type="button" className="post-menu-item" onClick={copyPostLink}>
              <Link2 size={15} />
              Copy link
            </button>
            {isOwnPost ? (
              <button type="button" className="post-menu-item danger" onClick={deletePost} disabled={deleting}>
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Delete post'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {post.location ? <p className="post-location">📍 {post.location}</p> : null}

      <p className="post-text">{post.text}</p>

      {post.media?.length ? (
        <div className={`media-grid media-count-${Math.min(post.media.length, 4)}`}>
          {post.media.map((item) =>
            item.type === 'video' ? (
              <video key={item.url} controls src={item.url} className="post-media" />
            ) : (
              <img key={item.url} src={item.url} alt="post media" className="post-media" />
            )
          )}
        </div>
      ) : null}

      <div className="chips-row">
        {post.hashtags?.map((tag) => (
          <span className="chip" key={tag}>#{tag}</span>
        ))}
      </div>

      <div className="post-actions">
        <button className={liked ? 'action-pill active' : 'action-pill'} onClick={toggleLike} type="button" aria-label="Like post">
          <Heart size={17} />
          <span>{likesCount}</span>
        </button>
        <button className="action-pill" type="button" aria-label="Comment on post" onClick={focusComment}>
          <MessageCircle size={17} />
          <span>{post.commentsCount || 0}</span>
        </button>
        <button className="action-pill" type="button" aria-label="Repost" onClick={repostPost}>
          <Repeat2 size={17} />
          <span>Repost</span>
        </button>
        <button className="action-pill" type="button" aria-label="Share post" onClick={sharePost}>
          <Share size={17} />
          <span>Share</span>
        </button>
        <button className={saved ? 'action-pill active' : 'action-pill'} type="button" aria-label="Save post" onClick={toggleSave}>
          <Bookmark size={17} />
        </button>
      </div>

      <form className="comment-form premium-comment-form" onSubmit={submitComment}>
        <img src={user?.avatar || '/avatar-placeholder.svg'} alt="me" className="avatar avatar-sm" />
        <input ref={commentInputRef} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." />
        <button className="primary-btn" type="submit">Post</button>
      </form>

      <AnimatePresence>
        {shareOpen ? (
          <motion.div className="share-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShareOpen(false)}>
            <motion.div
              className="share-modal glass-card"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="share-modal-head">
                <div>
                  <p className="eyebrow">Share post</p>
                  <h3>Send this to a friend</h3>
                </div>
                <button type="button" className="ghost-btn icon-only" onClick={() => setShareOpen(false)} aria-label="Close share modal">
                  <X size={14} />
                </button>
              </div>

              <div className="share-tabs">
                <button type="button" className={shareTab === 'following' ? 'switch-pill active' : 'switch-pill'} onClick={() => setShareTab('following')}>
                  Following
                </button>
                <button type="button" className={shareTab === 'followers' ? 'switch-pill active' : 'switch-pill'} onClick={() => setShareTab('followers')}>
                  Followers
                </button>
              </div>

              <button type="button" className="ghost-btn full" onClick={copyPostLink}>
                <Link2 size={15} />
                Copy post link
              </button>

              <div className="share-list">
                {shareLoading ? (
                  <p className="muted">Loading people...</p>
                ) : shareList.length ? (
                  shareList.map((person) => (
                    <button key={person._id} type="button" className="share-user-row" onClick={() => sendPostToUser(person)}>
                      <img src={person.avatar || '/avatar-placeholder.svg'} alt={person.username} className="avatar avatar-sm" />
                      <div>
                        <strong>{person.name}</strong>
                        <p>@{person.username}</p>
                      </div>
                      <span className="rail-follow">Send</span>
                    </button>
                  ))
                ) : (
                  <p className="muted">No people found in this list yet.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}