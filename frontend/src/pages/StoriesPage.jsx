import { useEffect, useState } from 'react';
import api from '../services/api';

export default function StoriesPage() {
  const [stories, setStories] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);

  const loadStories = async () => {
    const { data } = await api.get('/stories');
    setStories(data.stories || []);
  };

  useEffect(() => {
    loadStories();
  }, []);

  const createStory = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('caption', caption);
    if (file) formData.append('storyMedia', file);
    await api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setCaption('');
    setFile(null);
    await loadStories();
  };

  return (
    <div className="page-stack">
      <section className="feed-hero glass-card">
        <div>
          <p className="eyebrow">Stories</p>
          <h1>Share moments that disappear in 24 hours.</h1>
          <p>Story capture and reactions styled for a premium social experience.</p>
        </div>
      </section>

      <section className="composer-card glass-card">
        <form onSubmit={createStory} className="composer-form">
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Story caption" />
          <input type="file" accept="image/*,video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button className="primary-btn" type="submit">Share story</button>
        </form>
      </section>
      <div className="story-grid">
        {stories.map((story) => (
          <article key={story._id} className="panel-card glass-card story-card">
            <div className="profile-line">
              <img src={story.author?.avatar || '/avatar-placeholder.svg'} alt={story.author?.username} className="avatar avatar-sm" />
              <div>
                <strong>@{story.author?.username}</strong>
                <p>{story.caption}</p>
              </div>
            </div>
            {story.media?.type === 'video' ? <video controls src={story.media.url} className="post-media" /> : <img src={story.media?.url} alt="story" className="post-media" />}
          </article>
        ))}
      </div>
    </div>
  );
}