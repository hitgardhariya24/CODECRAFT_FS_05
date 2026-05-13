const Post = require('../models/Post');
const User = require('../models/User');
const { getPagination } = require('../utils/paginate');

const populate = [
  { path: 'author', select: 'name username avatar bio isOnline lastSeen profileVisibility' },
  { path: 'taggedUsers', select: 'name username avatar' },
];

// Filter posts based on author's profile visibility and follow status
const filterPostsByProfileVisibility = (posts, currentUser) => {
  if (!currentUser) return posts;
  
  const currentUserId = currentUser._id.toString();
  const followingIds = new Set(
    (currentUser.following || []).map(id => id.toString())
  );

  return posts.filter((post) => {
    // If author has public profile, always show
    if (post.author?.profileVisibility !== 'private') {
      return true;
    }

    // If private profile:
    // Show only if current user is the author or is following the author
    const authorId = post.author._id.toString();
    return currentUserId === authorId || followingIds.has(authorId);
  });
};

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
  const filteredPosts = filterPostsByProfileVisibility(posts, req.user);
  res.json({ posts: filteredPosts });
};

const getFollowingFeed = async (req, res) => {
  const { skip, limit } = getPagination(req.query);
  const filter = buildFeedQuery(req.user, 'following', req.query);
  const posts = await Post.find(filter).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const filteredPosts = filterPostsByProfileVisibility(posts, req.user);
  res.json({ posts: filteredPosts });
};

const getExploreFeed = async (req, res) => {
  const { skip, limit } = getPagination(req.query);
  const trendingPosts = await Post.find({ visibility: 'public' })
    .populate(populate)
    .sort({ commentsCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const filteredPosts = filterPostsByProfileVisibility(trendingPosts, req.user);

  const creators = await User.find({}).sort({ followers: -1, createdAt: -1 }).limit(8).select('name username avatar bio followers following isOnline');

  res.json({ posts: filteredPosts, creators });
};

module.exports = { getHomeFeed, getFollowingFeed, getExploreFeed, filterPostsByProfileVisibility };