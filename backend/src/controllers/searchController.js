const User = require('../models/User');
const Post = require('../models/Post');

const searchUsers = async (req, res) => {
  const { q = '' } = req.query;
  const users = await User.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } },
    ],
  }).select('name username avatar bio followers following isOnline').limit(10);
  res.json({ users });
};

const searchPosts = async (req, res) => {
  const { q = '' } = req.query;
  const posts = await Post.find({
    $or: [
      { text: { $regex: q, $options: 'i' } },
      { hashtags: { $regex: q.replace(/^#/, ''), $options: 'i' } },
    ],
  })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ posts });
};

const searchHashtags = async (req, res) => {
  const { q = '' } = req.query;
  const posts = await Post.find({ hashtags: { $regex: q.replace(/^#/, ''), $options: 'i' } }).select('hashtags');
  const hashtags = [...new Set(posts.flatMap((post) => post.hashtags).filter((tag) => tag.includes(q.replace(/^#/, '').toLowerCase())))];
  res.json({ hashtags: hashtags.slice(0, 10) });
};

const getSearchSuggestions = async (req, res) => {
  const { q = '' } = req.query;
  const [users, posts] = await Promise.all([
    User.find({ username: { $regex: q, $options: 'i' } }).select('name username avatar').limit(5),
    Post.find({ text: { $regex: q, $options: 'i' } }).select('text hashtags').limit(5),
  ]);

  res.json({
    suggestions: {
      users,
      posts,
      hashtags: posts.flatMap((post) => post.hashtags).slice(0, 5),
    },
  });
};

module.exports = { searchUsers, searchPosts, searchHashtags, getSearchSuggestions };