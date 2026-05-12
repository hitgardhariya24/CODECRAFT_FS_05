const Post = require('../models/Post');
const User = require('../models/User');
const { getPagination } = require('../utils/paginate');

const basePopulate = [
  { path: 'author', select: 'name username avatar bio isOnline lastSeen' },
  { path: 'taggedUsers', select: 'name username avatar' },
];

const getFeedPipeline = async ({ user, mode, query }) => {
  const { skip, limit } = getPagination(query);
  const filter = {};

  if (mode === 'following' && user) {
    const followingIds = [...user.following.map((item) => item.toString()), user._id.toString()];
    filter.author = { $in: followingIds };
  }

  if (query.hashtag) {
    filter.hashtags = query.hashtag.toLowerCase();
  }

  const posts = await Post.find(filter)
    .populate(basePopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return posts;
};

const getSuggestedCreators = async (currentUserId, limit = 8) => {
  const excluded = currentUserId ? [currentUserId] : [];
  const users = await User.find({ _id: { $nin: excluded } })
    .sort({ followers: -1, createdAt: -1 })
    .limit(limit)
    .select('name username avatar bio followers following isOnline');
  return users;
};

module.exports = { getFeedPipeline, getSuggestedCreators, basePopulate };