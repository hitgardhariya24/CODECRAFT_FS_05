import { useEffect, useState } from 'react';
import api from '../services/api';
import AvatarImage from './AvatarImage';
import { motion } from 'framer-motion';

export default function StoryRail() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get('/stories');
      setStories(data.stories || []);
    };
    load();
  }, []);

  return (
    <section className="story-rail glass-card">
      <div className="story-rail-header">
        <div>
          <p className="eyebrow">Stories</p>
          <h3>Recent updates</h3>
        </div>
      </div>
      {stories.map((story) => (
        <motion.div key={story._id} className="story-pill" whileHover={{ y: -4, scale: 1.03 }} transition={{ duration: 0.18 }}>
          <div className="story-ring">
            <AvatarImage src={story.author?.avatar} alt="story author" className="story-avatar" />
          </div>
          <span>{story.author?.username}</span>
        </motion.div>
      ))}
    </section>
  );
}