import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Heart, MessageCircle, Repeat2, Share, BadgeCheck, Trash2, Link2, Users, X, Send } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import AvatarImage from './AvatarImage';
import { getMediaUrl, isValidMediaUrl } from '../utils/media';

export default function PostCard({ post, onChanged, initialSaved = false, showRepostBadge = false }) {
  const { user } = useAuth();
  const menuRef = useRef(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.likes?.includes(user?._id)));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [saved, setSaved] = useState(Boolean(initialSaved));
  const [savingPost, setSavingPost] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTab, setShareTab] = useState('following');
  const [shareUsers, setShareUsers] = useState({ following: [], followers: [] });
  const [shareLoading, setShareLoading] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const verified = Boolean(post.author?.verified || post.author?.isVerified);
  const isOwnPost = post.author?.username === user?.username;

  const authorInitial = useMemo(() => post.author?.name?.slice(0, 1)?.toUpperCase() || 'U', [post.author]);
  const resolveAvatar = (person) => (person?.username === user?.username ? user?.avatar : person?.avatar);

  const closeComments = () => setCommentsOpen(false);

  useEffect(() => {
    setSaved(Boolean(initialSaved));
  }, [initialSaved]);

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

  useEffect(() => {
    setCommentsCount(post.commentsCount || 0);
  }, [post.commentsCount]);

  useEffect(() => {
    const loadComments = async () => {
      if (!commentsOpen) return;

      setCommentsLoading(true);
      try {
        const { data } = await api.get(`/posts/${post._id}/comments`);
        setComments(data.comments || []);
        setCommentsCount(post.commentsCount || (data.comments || []).length);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not load comments');
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [commentsOpen, post._id, post.commentsCount]);

  useEffect(() => {
    if (!commentsOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeComments();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [commentsOpen]);

  const toggleLike = async () => {
    const { data } = await api.post(`/posts/${post._id}/like`);
    setLiked(data.liked);
    setLikesCount(data.likesCount);
    onChanged?.();
  };

  const openComments = () => {
    setCommentsOpen(true);
    setMenuOpen(false);
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

  const repostPost = async () => {
    setReposting(true);
    try {
      await api.post(`/posts/${post._id}/repost`);
      toast.success('Reposted');
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not repost');
    } finally {
      setReposting(false);
    }
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

  const toggleSave = async () => {
    if (savingPost) return;

    const nextSavedState = !saved;
    setSavingPost(true);
    setSaved(nextSavedState);

    try {
      const { data } = await api.post(`/users/saved/${post._id}`);
      toast.success(data.message || (nextSavedState ? 'Post saved' : 'Removed from saved'));
      onChanged?.();
    } catch (error) {
      setSaved(!nextSavedState);
      toast.error(error.response?.data?.message || 'Could not update saved posts');
    } finally {
      setSavingPost(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;

    setCommentSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text: commentText });
      setComments((current) => [...current, { ...data.comment, replies: [] }]);
      setCommentsCount((current) => current + 1);
      setCommentText('');
      toast.success('Comment added');
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const renderComment = (item, depth = 0) => (
    <div key={item._id} className={`post-comment-item ${depth ? 'reply' : ''}`} style={{ marginLeft: depth ? 18 : 0 }}>
      <AvatarImage src={resolveAvatar(item.author)} alt={item.author?.username || 'comment author'} className="avatar avatar-sm post-comment-avatar" />
      <div className="post-comment-body">
        <div className="post-comment-head">
          <strong>{item.author?.name || item.author?.username || 'Someone'}</strong>
          <span>@{item.author?.username || 'user'}</span>
          <span>{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        </div>
        <p>{item.text}</p>
        {item.replies?.length ? <div className="post-comment-replies">{item.replies.map((reply) => renderComment(reply, depth + 1))}</div> : null}
      </div>
    </div>
  );

  const repostCount = post.sharesCount || 0;

  return (
    <>
      <motion.article className="post-card glass-card" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
        <div className="post-head">
          {post.author?.avatar ? (
            <AvatarImage src={resolveAvatar(post.author)} alt="author" className="avatar" />
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
          {showRepostBadge && repostCount > 0 ? (
            <span className="post-repost-pill" title={`${repostCount} repost${repostCount === 1 ? '' : 's'}`}>
              <Repeat2 size={14} />
              <span>{repostCount}</span>
            </span>
          ) : null}
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
            {post.media.map((item) => {
              const fullUrl = getMediaUrl(item.url);
              const isValid = isValidMediaUrl(item.url);

              if (!isValid) {
                return null;
              }

              return item.type === 'video' ? (
                <video
                  key={item.url}
                  controls
                  src={fullUrl}
                  className="post-media"
                  onError={(e) => {
                    console.error('Video failed to load:', fullUrl);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <img
                  key={item.url}
                  src={fullUrl}
                  alt={item.originalName || 'post media'}
                  className="post-media"
                  onError={(e) => {
                    console.error('Image failed to load:', fullUrl);
                    e.target.style.display = 'none';
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {post.hashtags?.length ? <p className="post-text" style={{ marginTop: '8px', color: 'var(--muted)' }}>{post.hashtags.map((tag) => `#${tag}`).join(' ')}</p> : null}

        <div className="post-actions">
          <button className={liked ? 'action-pill active' : 'action-pill'} onClick={toggleLike} type="button" aria-label="Like post">
            <Heart size={17} />
            <span>{likesCount}</span>
          </button>
          <button className="action-pill" type="button" aria-label="Comment on post" onClick={openComments}>
            <MessageCircle size={17} />
            <span>{commentsCount}</span>
          </button>
          <button className="action-pill" type="button" aria-label="Repost" onClick={repostPost} disabled={reposting}>
            <Repeat2 size={17} />
            <span>{reposting ? 'Posting...' : 'Repost'}</span>
          </button>
          <button className="action-pill" type="button" aria-label="Share post" onClick={sharePost}>
            <Share size={17} />
            <span>Share</span>
          </button>
          <button className={saved ? 'action-pill active' : 'action-pill'} type="button" aria-label="Save post" onClick={toggleSave} disabled={savingPost}>
            <Bookmark size={17} />
          </button>
        </div>
      </motion.article>

      <AnimatePresence>
        {commentsOpen ? (
          <motion.div className="post-comments-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeComments}>
            <motion.aside
              className="post-comments-drawer glass-card"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="post-comments-head">
                <div>
                  <p className="eyebrow">Conversation</p>
                  <h3>Comments</h3>
                  <p>{commentsCount} comment{commentsCount === 1 ? '' : 's'}</p>
                </div>
                <button type="button" className="ghost-btn icon-only" onClick={closeComments} aria-label="Close comments panel">
                  <X size={16} />
                </button>
              </div>

              <div className="post-comments-list">
                {commentsLoading ? (
                  <div className="notification-empty">
                    <p>Loading comments...</p>
                  </div>
                ) : comments.length ? (
                  comments.map((item) => renderComment(item))
                ) : (
                  <div className="notification-empty">
                    <strong>No comments yet</strong>
                    <p>Be the first to start the conversation.</p>
                  </div>
                )}
              </div>

              <form className="post-comments-composer" onSubmit={submitComment}>
                <AvatarImage src={user?.avatar} alt="me" className="avatar avatar-sm" />
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                />
                <button className="primary-btn post-comments-submit" type="submit" disabled={commentSubmitting || !commentText.trim()}>
                  <Send size={15} />
                  {commentSubmitting ? 'Posting...' : 'Post'}
                </button>
              </form>
            </motion.aside>
          </motion.div>
        ) : null}

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
                      <AvatarImage src={resolveAvatar(person)} alt={person.username} className="avatar avatar-sm" />
                      <div>
                        <strong>{person.name}</strong>
                        <p>@{person.username}</p>
                      </div>
                      <span className="rail-follow">Send</span>
                    </button>
                  ))
                ) : (
                  <div className="notification-empty">
                    <strong>No people to share with</strong>
                    <p>Follow or add people to send this post.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}