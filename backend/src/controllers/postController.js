const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { extractHashtags, buildMediaPayload } = require('../services/postUtils');
const { toPublicUrl } = require('../utils/media');
const { getPagination } = require('../utils/paginate');

const postPopulate = [
  { path: 'author', select: 'name username avatar bio isOnline lastSeen' },
  { path: 'taggedUsers', select: 'name username avatar' },
];

const createPost = async (req, res) => {
  const { text = '', visibility = 'public', taggedUsers = '', hashtags = '', location = '' } = req.body;
  const files = (req.files || []).map((file) => ({
    ...file,
    url: toPublicUrl(file.path),
  }));

  const post = await Post.create({
    author: req.user._id,
    text,
    visibility,
    media: buildMediaPayload(files),
    location,
    taggedUsers: taggedUsers ? String(taggedUsers).split(',').filter(Boolean) : [],
    hashtags: extractHashtags(text, hashtags ? String(hashtags).split(',') : []),
  });

  const populated = await Post.findById(post._id).populate(postPopulate);
  res.status(201).json({ post: populated });
};

const updatePost = async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (!post.author.equals(req.user._id)) return res.status(403).json({ message: 'Not allowed' });

  const { text = '', visibility = 'public', taggedUsers = '', hashtags = '', location = '' } = req.body;
  const files = (req.files || []).map((file) => ({ ...file, url: toPublicUrl(file.path) }));

  post.text = text;
  post.visibility = visibility;
  post.location = location;
  if (files.length) post.media = buildMediaPayload(files);
  post.taggedUsers = taggedUsers ? String(taggedUsers).split(',').filter(Boolean) : [];
  post.hashtags = extractHashtags(text, hashtags ? String(hashtags).split(',') : []);
  await post.save();

  const updated = await Post.findById(post._id).populate(postPopulate);
  res.json({ post: updated });
};

const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (!post.author.equals(req.user._id)) return res.status(403).json({ message: 'Not allowed' });

  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();
  res.json({ message: 'Post deleted' });
};

const getPostById = async (req, res) => {
  const post = await Post.findById(req.params.postId).populate(postPopulate);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json({ post });
};

const toggleLike = async (req, res) => {
  const post = await Post.findById(req.params.postId).populate('author', 'username');
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const hasLiked = post.likes.some((userId) => userId.equals(req.user._id));
  post.likes = hasLiked ? post.likes.filter((userId) => !userId.equals(req.user._id)) : [...post.likes, req.user._id];
  await post.save();

  if (!hasLiked && !post.author._id.equals(req.user._id)) {
    await createNotification({
      recipient: post.author._id,
      actor: req.user._id,
      type: 'like',
      post: post._id,
      text: `${req.user.username || 'Someone'} liked your post`,
    });
  }

  res.json({ liked: !hasLiked, likesCount: post.likes.length });
};

const addComment = async (req, res) => {
  const { text, parentComment = null } = req.body;
  if (!text) return res.status(400).json({ message: 'Comment text is required' });

  const post = await Post.findById(req.params.postId).populate('author', 'username');
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const comment = await Comment.create({ post: post._id, author: req.user._id, text, parentComment: parentComment || null });
  post.commentsCount += 1;
  await post.save();

  if (!post.author._id.equals(req.user._id)) {
    await createNotification({
      recipient: post.author._id,
      actor: req.user._id,
      type: 'comment',
      post: post._id,
      comment: comment._id,
      text: `${req.user.username || 'Someone'} commented on your post`,
    });
  }

  const populated = await Comment.findById(comment._id).populate('author', 'name username avatar');
  res.status(201).json({ comment: populated });
};

const updateComment = async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: 'Not allowed' });

  comment.text = req.body.text ?? comment.text;
  await comment.save();
  const populated = await Comment.findById(comment._id).populate('author', 'name username avatar');
  res.json({ comment: populated });
};

const deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: 'Not allowed' });

  await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentComment: comment._id }] });
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
  res.json({ message: 'Comment deleted' });
};

const reactToComment = async (req, res) => {
  const { emoji = 'like' } = req.body;
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  const existingIndex = comment.reactions.findIndex((reaction) => reaction.user.equals(req.user._id));
  if (existingIndex >= 0) {
    comment.reactions[existingIndex].emoji = emoji;
  } else {
    comment.reactions.push({ user: req.user._id, emoji });
  }
  await comment.save();
  res.json({ message: 'Reaction updated' });
};

const getCommentsForPost = async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate('author', 'name username avatar')
    .sort({ createdAt: 1 });

  const byId = new Map();
  const roots = [];

  comments.forEach((comment) => {
    const plain = comment.toObject();
    plain.replies = [];
    byId.set(String(comment._id), plain);
  });

  comments.forEach((comment) => {
    const plain = byId.get(String(comment._id));
    if (comment.parentComment && byId.has(String(comment.parentComment))) {
      byId.get(String(comment.parentComment)).replies.push(plain);
    } else {
      roots.push(plain);
    }
  });

  res.json({ comments: roots });
};

const getTrendingPosts = async (req, res) => {
  const { skip, limit } = getPagination(req.query);
  const posts = await Post.find()
    .populate(postPopulate)
    .sort({ likes: -1, commentsCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
  res.json({ posts });
};

module.exports = {
  createPost,
  updatePost,
  deletePost,
  getPostById,
  toggleLike,
  addComment,
  updateComment,
  deleteComment,
  reactToComment,
  getCommentsForPost,
  getTrendingPosts,
};