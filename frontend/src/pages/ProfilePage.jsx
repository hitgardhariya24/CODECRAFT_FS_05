import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';
import Skeleton from '../components/Skeleton';
import CreatePostModal from '../components/CreatePostModal';
import AvatarImage from '../components/AvatarImage';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Repeat2, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { username } = useParams();
  const { user, updateUser } = useAuth();
  const socket = useSocket();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [form, setForm] = useState({ name: '', bio: '', about: '', website: '', location: '', profileVisibility: 'public' });
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);
  const [accessState, setAccessState] = useState({ canViewPosts: true, hasPendingRequest: false, isFollowing: false });
  const [createOpen, setCreateOpen] = useState(false);
  const [composer, setComposer] = useState({ text: '', hashtags: '', taggedUsers: '', location: '' });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreview, setMediaPreview] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await api.get(`/users/${username}`);
      setProfile(data.user);
      setPosts(data.posts || []);
      setAccessState({
        canViewPosts: data.canViewPosts ?? true,
        hasPendingRequest: data.hasPendingRequest ?? false,
        isFollowing: data.isFollowing ?? false,
      });
      setForm({
        name: data.user.name || '',
        bio: data.user.bio || '',
        about: data.user.about || '',
        website: data.user.website || '',
        location: data.user.location || '',
        profileVisibility: data.user.profileVisibility || 'public',
      });
      setLoading(false);
    };
    load();
  }, [username]);

  useEffect(() => {
    if (!editing) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editing]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleRequestStatus = (payload) => {
      if (!payload || payload.targetUsername !== username) return;

      if (payload.status === 'requested') {
        setAccessState((current) => ({
          ...current,
          hasPendingRequest: true,
        }));
      }

      if (payload.status === 'accepted') {
        setAccessState((current) => ({
          ...current,
          hasPendingRequest: false,
          isFollowing: true,
          canViewPosts: true,
        }));
      }
    };

    socket.on('follow:request:status', handleRequestStatus);
    return () => socket.off('follow:request:status', handleRequestStatus);
  }, [socket, username]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const { data } = await api.patch('/users/profile', form);
    let updatedUser = data.user;

    if (profileAvatar) {
      const avatarData = new FormData();
      avatarData.append('avatar', profileAvatar);
      const avatarResponse = await api.patch('/users/avatar', avatarData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updatedUser = {
        ...avatarResponse.data.user,
        avatar: avatarResponse.data.avatarUrl || avatarResponse.data.user.avatar,
      };
    }

    updateUser(updatedUser);
    setProfile(updatedUser);
    setProfileAvatar(null);
    setAvatarPreview(null);
    setEditing(false);
    toast.success('Profile updated');
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileAvatar(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setProfileAvatar(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const closeEditor = () => {
    setEditing(false);
    removeAvatar();
  };

  const follow = async () => {
    await api.post(`/users/${username}/follow`);
    toast.success(profile?.profileVisibility === 'private' ? 'Follow request sent' : 'Followed');
    if (profile?.profileVisibility === 'private') {
      setAccessState((current) => ({ ...current, hasPendingRequest: true }));
    } else {
      setAccessState((current) => ({ ...current, isFollowing: true }));
    }
  };

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

  if (loading) return <Skeleton lines={5} />;

  const isOwnProfile = user?.username === username;
  const requestStatus = profile?.profileVisibility === 'private' && !isOwnProfile;
  const visiblePosts = accessState.canViewPosts
    ? activeTab === 'media'
      ? posts.filter((post) => post.media?.length)
      : activeTab === 'reposts'
        ? posts.filter((post) => (post.sharesCount || 0) > 0)
      : activeTab === 'replies'
        ? []
        : posts
    : [];

  return (
    <div className="page-stack profile-page-shell">
      <section className="profile-hero glass-card">
        <AvatarImage src={profile.avatar} alt="profile" className="profile-avatar" />
        <div className="profile-meta">
          <p className="eyebrow">Profile</p>
          <h2>{profile.name || profile.username}</h2>
          <p>@{profile.username}</p>
          <p className="profile-bio">{profile.bio || 'No bio yet.'}</p>
          <div className="stats-row profile-stats">
            <span><strong>{profile.followersCount}</strong> Followers</span>
            <span><strong>{profile.followingCount}</strong> Following</span>
            <span><strong>{posts.length}</strong> Posts</span>
          </div>
        </div>
        <div className="profile-actions">
          {isOwnProfile ? (
            <>
              <button className="primary-btn" onClick={() => setCreateOpen(true)}>Add post</button>
              <button className="ghost-btn" onClick={() => setEditing((current) => !current)}>{editing ? 'Close editor' : 'Edit profile'}</button>
            </>
          ) : requestStatus ? (
            <button className="primary-btn" onClick={follow} disabled={accessState.hasPendingRequest}>
              {accessState.hasPendingRequest ? 'Request sent' : 'Request access'}
            </button>
          ) : (
            <button className="primary-btn" onClick={follow}>{accessState.isFollowing ? 'Following' : 'Follow'}</button>
          )}
        </div>
      </section>

      <AnimatePresence>
        {editing ? (
          <>
            <motion.div
              className="profile-editor-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEditor}
            />
            <motion.aside
              className="profile-editor-drawer glass-card"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <form className="profile-editor-panel" onSubmit={saveProfile}>
                <div className="profile-editor-header">
                  <div>
                    <p className="eyebrow">Edit profile</p>
                    <h3>Update your profile</h3>
                  </div>
                  <button type="button" className="profile-editor-close" onClick={closeEditor} aria-label="Close edit profile panel">
                    <X size={20} />
                  </button>
                </div>

                <div className="profile-avatar-section">
                  <div className="avatar-upload-wrapper">
                    <div className="avatar-display">
                      <AvatarImage
                        src={avatarPreview || profile.avatar}
                        alt="profile"
                        className="avatar-preview"
                      />
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <div className="avatar-actions">
                    <button type="button" className="avatar-upload-label" onClick={() => avatarInputRef.current?.click()}>
                      <Camera size={16} />
                      Change Photo
                    </button>
                    {(avatarPreview || profileAvatar) && (
                      <button type="button" className="avatar-remove-btn" onClick={removeAvatar}>
                        <X size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="profile-editor-form">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="Your name"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(event) => setForm({ ...form, bio: event.target.value })}
                      placeholder="Tell us about yourself"
                      className="form-textarea"
                      maxLength="160"
                    />
                    <span className="form-char-count">{form.bio.length}/160</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">About</label>
                    <textarea
                      value={form.about}
                      onChange={(event) => setForm({ ...form, about: event.target.value })}
                      placeholder="More details about you"
                      className="form-textarea"
                      maxLength="500"
                    />
                    <span className="form-char-count">{form.about.length}/500</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Website</label>
                      <input
                        type="url"
                        value={form.website}
                        onChange={(event) => setForm({ ...form, website: event.target.value })}
                        placeholder="https://yourwebsite.com"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(event) => setForm({ ...form, location: event.target.value })}
                        placeholder="Your location"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-editor-actions">
                  <button type="button" className="cancel-btn" onClick={closeEditor}>
                    Cancel
                  </button>
                  <button className="primary-btn save-btn" type="submit">
                    Save changes
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="profile-tabs glass-card">
        <button type="button" className={activeTab === 'posts' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('posts')}>Posts</button>
        <button type="button" className={activeTab === 'media' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('media')}>Media</button>
        <button type="button" className={activeTab === 'reposts' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('reposts')}>
          <Repeat2 size={15} />
          Reposts
        </button>
        <button type="button" className={activeTab === 'replies' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('replies')}>Replies</button>
      </div>

      <div className="profile-feed-grid">
        {accessState.canViewPosts ? (
          visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post._id} post={post} showRepostBadge />) : <p className="muted center-text">No {activeTab} to show yet.</p>
        ) : (
          <div className="private-profile-locked glass-card" role="status" aria-live="polite">
            <div className="private-lock-icon" aria-hidden>
              <Lock size={26} />
            </div>
            <strong className="private-title">This profile is private</strong>
            <p className="private-subtitle">Request access to follow and view posts from this profile.</p>
            <button
              type="button"
              className="request-follow-btn"
              onClick={follow}
              disabled={accessState.hasPendingRequest}
              aria-pressed={accessState.hasPendingRequest}
            >
              {accessState.hasPendingRequest ? 'Request sent' : 'Request to Follow'}
            </button>
          </div>
        )}
      </div>

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitPost}
        form={composer}
        setForm={setComposer}
        mediaPreview={mediaPreview}
        setMediaFiles={setMediaFiles}
        setMediaPreview={setMediaPreview}
        variant="drawer"
      />
    </div>
  );
}