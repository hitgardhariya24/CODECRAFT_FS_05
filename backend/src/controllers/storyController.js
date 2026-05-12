const Story = require('../models/Story');
const { toPublicUrl } = require('../utils/media');

const createStory = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Story media is required' });
  }

  const story = await Story.create({
    author: req.user._id,
    media: {
      url: toPublicUrl(req.file.path),
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
    },
    caption: req.body.caption || '',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  res.status(201).json({ story });
};

const getStories = async (req, res) => {
  const stories = await Story.find({ expiresAt: { $gt: new Date() } })
    .populate('author', 'name username avatar isOnline lastSeen')
    .sort({ createdAt: -1 });
  res.json({ stories });
};

const viewStory = async (req, res) => {
  const story = await Story.findById(req.params.storyId);
  if (!story) return res.status(404).json({ message: 'Story not found' });

  if (!story.viewers.some((viewer) => viewer.equals(req.user._id))) {
    story.viewers.push(req.user._id);
    await story.save();
  }

  res.json({ message: 'Story viewed' });
};

const reactToStory = async (req, res) => {
  const { emoji = 'like' } = req.body;
  const story = await Story.findById(req.params.storyId);
  if (!story) return res.status(404).json({ message: 'Story not found' });

  const existing = story.reactions.find((reaction) => reaction.user.equals(req.user._id));
  if (existing) {
    existing.emoji = emoji;
  } else {
    story.reactions.push({ user: req.user._id, emoji });
  }
  await story.save();
  res.json({ message: 'Reaction recorded' });
};

const deleteExpiredStories = async (_req, res) => {
  const result = await Story.deleteMany({ expiresAt: { $lt: new Date() } });
  res.json({ deleted: result.deletedCount });
};

module.exports = { createStory, getStories, viewStory, reactToStory, deleteExpiredStories };