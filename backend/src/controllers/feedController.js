const Post = require('../models/Post');
const User = require('../models/User');
const { getPagination } = require('../utils/paginate');

const populate = [
  { path: 'author', select: 'name username avatar bio isOnline lastSeen' },
  { path: 'taggedUsers', select: 'name username avatar' },
];

const buildFeedQuery = (user, mode, query) => {
  const filter = { visibility: 'public' };

  if (mode === 'following' && user) {
    filter.author = { $in: [user._id, ...(user.following || [])] };
  }

  if (query?.hashtag) {
    filter.hashtags = query.hashtag.toLowerCase();
  }

  if (query?.author) {
    filter.author = query.author;
  }

  return filter;
};

const getHomeFeed = async (req, res) => {
  const { skip, limit } = getPagination(req.query);
  const filter = buildFeedQuery(req.user, 'home', req.query);
  const posts = await Post.find(filter).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ posts });
};

const getFollowingFeed = async (req, res) => {
  const { skip, limit } = getPagination(req.query);
  const filter = buildFeedQuery(req.user, 'following', req.query);
  const posts = await Post.find(filter).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ posts });
};

const getExploreFeed = async (req, res) => {
  const { skip, limit } = getPagination(req.query);
  const trendingPosts = await Post.find({ visibility: 'public' })
    .populate(populate)
    .sort({ commentsCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const creators = await User.find({}).sort({ followers: -1, createdAt: -1 }).limit(8).select('name username avatar bio followers following isOnline');

  res.json({ posts: trendingPosts, creators });
};

module.exports = { getHomeFeed, getFollowingFeed, getExploreFeed };