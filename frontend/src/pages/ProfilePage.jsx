import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';
import Skeleton from '../components/Skeleton';
import CreatePostModal from '../components/CreatePostModal';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { username } = useParams();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [form, setForm] = useState({ name: '', bio: '', about: '', website: '', location: '', profileVisibility: 'public' });
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

  const saveProfile = async (event) => {
    event.preventDefault();
    const { data } = await api.patch('/users/profile', form);
    updateUser(data.user);
    setProfile(data.user);
    setEditing(false);
    toast.success('Profile updated');
  };

  const follow = async () => {
    await api.post(`/users/${username}/follow`);
    toast.success(profile?.profileVisibility === 'private' ? 'Follow request sent' : 'Followed');
    if (profile?.profileVisibility === 'private') {
      setAccessState((current) => ({ ...current, hasPendingRequest: true }));
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
      : activeTab === 'replies'
        ? []
        : posts
    : [];

  const canEditVisibility = isOwnProfile;

  return (
    <div className="page-stack profile-page-shell">
      <section className="profile-hero glass-card">
        <img src={profile.avatar || '/avatar-placeholder.svg'} alt="profile" className="profile-avatar" />
        <div className="profile-meta">
          <p className="eyebrow">Profile</p>
          <h2>{profile.name || profile.username}</h2>
          <p>@{profile.username}</p>
          <p className="profile-visibility-badge">{profile.profileVisibility === 'private' ? 'Private profile' : 'Public profile'}</p>
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

      {editing ? (
        <form className="composer-card glass-card" onSubmit={saveProfile}>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
          <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Bio" />
          <textarea value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} placeholder="About" />
          <div className="grid-2">
            <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="Website" />
            <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Location" />
          </div>
          {canEditVisibility ? (
            <div className="settings-visibility-card profile-visibility-editor">
              <div className="settings-visibility-head">
                <Lock size={16} />
                <div>
                  <strong>Profile visibility</strong>
                  <p>Public profiles can be viewed by anyone. Private profiles require a request first.</p>
                </div>
              </div>
              <div className="grid-2 settings-visibility-options">
                <button type="button" className={form.profileVisibility === 'public' ? 'switch-pill active' : 'switch-pill'} onClick={() => setForm({ ...form, profileVisibility: 'public' })}>
                  Public
                </button>
                <button type="button" className={form.profileVisibility === 'private' ? 'switch-pill active' : 'switch-pill'} onClick={() => setForm({ ...form, profileVisibility: 'private' })}>
                  Private
                </button>
              </div>
            </div>
          ) : null}
          <button className="primary-btn" type="submit">Save changes</button>
        </form>
      ) : null}

      <div className="profile-tabs glass-card">
        <button type="button" className={activeTab === 'posts' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('posts')}>Posts</button>
        <button type="button" className={activeTab === 'media' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('media')}>Media</button>
        <button type="button" className={activeTab === 'replies' ? 'switch-pill active' : 'switch-pill'} onClick={() => setActiveTab('replies')}>Replies</button>
      </div>

      <div className="profile-feed-grid">
        {accessState.canViewPosts ? (
          visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post._id} post={post} />) : <p className="muted center-text">No {activeTab} to show yet.</p>
        ) : (
          <div className="private-profile-locked glass-card">
            <Lock size={22} />
            <strong>This profile is private</strong>
            <p>Send a request first to see the posts.</p>
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