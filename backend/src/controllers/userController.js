const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { toPublicUrl } = require('../utils/media');
const { createNotification } = require('../services/notificationService');
const { emitToUser } = require('../socket');

const isPrivateProfileVisible = (profile, viewerId) => {
  if (!profile || profile.profileVisibility !== 'private') return true;
  if (!viewerId) return false;
  if (profile._id.equals(viewerId)) return true;
  return profile.followers.some((id) => id.equals(viewerId));
};

const getUserByUsername = async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() })
    .populate('followers', 'name username avatar')
    .populate('following', 'name username avatar');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const canViewPosts = isPrivateProfileVisible(user, req.user?._id);
  const hasPendingRequest = !canViewPosts
    ? Boolean(
        await Notification.findOne({
          recipient: user._id,
          actor: req.user._id,
          type: { $in: ['follow_request', 'request'] },
        })
      )
    : false;

  const posts = canViewPosts
    ? await Post.find({ author: user._id }).sort({ createdAt: -1 }).limit(20).populate('author', 'name username avatar')
    : [];

  res.json({
    user: user.getPublicProfile(),
    posts,
    canViewPosts,
    isFollowing: user.followers.some((id) => id.equals(req.user._id)),
    hasPendingRequest,
  });
};

const updateProfile = async (req, res) => {
  const { name, bio, about, website, location, profileVisibility } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.name = name ?? user.name;
  user.bio = bio ?? user.bio;
  user.about = about ?? user.about;
  user.website = website ?? user.website;
  user.location = location ?? user.location;
  if (profileVisibility === 'public' || profileVisibility === 'private') {
    user.profileVisibility = profileVisibility;
  }
  await user.save();

  res.json({ user: user.getPublicProfile() });
};

const updateAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Avatar image is required' });
  }

  const user = await User.findById(req.user._id);
  user.avatar = toPublicUrl(req.file.path);
  await user.save();

  res.json({
    user: user.getPublicProfile(),
    avatarUrl: user.avatar,
  });
};

const followUser = async (req, res) => {
  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot follow yourself' });

  const currentUser = await User.findById(req.user._id);
  const alreadyFollowing = currentUser.following.some((id) => id.equals(target._id));

  if (target.profileVisibility === 'private' && !alreadyFollowing) {
    const existingRequest = await Notification.findOne({
      recipient: target._id,
      actor: currentUser._id,
      type: { $in: ['follow_request', 'request'] },
    });

    if (!existingRequest) {
      await createNotification({
        recipient: target._id,
        actor: currentUser._id,
        type: 'follow_request',
        text: `${currentUser.username} wants to follow you`,
      });
    }

    emitToUser(currentUser._id.toString(), 'follow:request:status', {
      actorId: currentUser._id.toString(),
      actorUsername: currentUser.username,
      targetId: target._id.toString(),
      targetUsername: target.username,
      status: 'requested',
      hasPendingRequest: true,
      isFollowing: false,
    });

    return res.json({ message: existingRequest ? 'Follow request already sent' : 'Follow request sent' });
  }

  if (!alreadyFollowing) {
    currentUser.following.push(target._id);
    target.followers.push(currentUser._id);
    await currentUser.save();
    await target.save();
    await createNotification({
      recipient: target._id,
      actor: currentUser._id,
      type: 'follow',
      text: `${currentUser.username} started following you`,
    });

    emitToUser(currentUser._id.toString(), 'follow:request:status', {
      actorId: currentUser._id.toString(),
      actorUsername: currentUser.username,
      targetId: target._id.toString(),
      targetUsername: target.username,
      status: 'following',
      hasPendingRequest: false,
      isFollowing: true,
    });
  }

   res.json({ 
     message: alreadyFollowing ? 'Already following' : 'Followed successfully',
     isFollowing: true
   });
};

const acceptFollowRequest = async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    recipient: req.user._id,
    type: { $in: ['follow_request', 'request'] },
  }).populate('actor', 'name username avatar');

  if (!notification) {
    return res.status(404).json({ message: 'Follow request not found' });
  }

  const recipient = await User.findById(req.user._id);
  const actor = await User.findById(notification.actor._id);

  if (!recipient.followers.some((id) => id.equals(actor._id))) {
    recipient.followers.push(actor._id);
  }

  if (!actor.following.some((id) => id.equals(recipient._id))) {
    actor.following.push(recipient._id);
  }

  await recipient.save();
  await actor.save();

  await createNotification({
    recipient: actor._id,
    actor: recipient._id,
    type: 'follow_accepted',
    text: `${recipient.username} accepted your follow request`,
  });

  await Notification.deleteOne({ _id: notification._id });

  emitToUser(actor._id.toString(), 'follow:request:status', {
    actorId: actor._id.toString(),
    actorUsername: actor.username,
    targetId: recipient._id.toString(),
    targetUsername: recipient.username,
    status: 'accepted',
    hasPendingRequest: false,
    isFollowing: true,
    message: `${recipient.username} accepted your follow request`,
  });

  emitToUser(recipient._id.toString(), 'follow:request:status', {
    actorId: actor._id.toString(),
    actorUsername: actor.username,
    targetId: recipient._id.toString(),
    targetUsername: recipient.username,
    status: 'accepted-self',
    hasPendingRequest: false,
    isFollowing: false,
    message: `You accepted ${actor.username}'s request`,
  });

  emitToUser(recipient._id.toString(), 'notification:removed', {
    notificationId: notification._id.toString(),
    type: notification.type,
  });

  res.json({ message: 'Follow request accepted' });
};

const deleteFollowRequest = async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.notificationId,
    recipient: req.user._id,
    type: { $in: ['follow_request', 'request'] },
  });

  if (!notification) {
    return res.status(404).json({ message: 'Follow request not found' });
  }

  emitToUser(notification.actor.toString(), 'follow:request:status', {
    actorId: notification.actor.toString(),
    targetId: notification.recipient.toString(),
    targetUsername: req.user.username,
    status: 'deleted',
    hasPendingRequest: false,
    isFollowing: false,
    message: `${req.user.username} deleted your follow request`,
  });

  emitToUser(req.user._id.toString(), 'notification:removed', {
    notificationId: notification._id.toString(),
    type: notification.type,
  });

  res.json({ message: 'Follow request deleted' });
};

const unfollowUser = async (req, res) => {
  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target) return res.status(404).json({ message: 'User not found' });

  const currentUser = await User.findById(req.user._id);
  currentUser.following = currentUser.following.filter((id) => !id.equals(target._id));
  target.followers = target.followers.filter((id) => !id.equals(currentUser._id));
  await currentUser.save();
  await target.save();

  res.json({ message: 'Unfollowed successfully' });
};

const getFollowers = async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate('followers', 'name username avatar bio');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ followers: user.followers });
};

const getFollowing = async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate('following', 'name username avatar bio');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ following: user.following });
};

const getSuggestedUsers = async (req, res) => {
  const user = await User.findById(req.user._id);
  const suggestions = await User.find({ _id: { $nin: [req.user._id, ...user.following] } })
    .sort({ followers: -1, createdAt: -1 })
    .limit(10)
    .select('name username avatar bio followers following isOnline');
  res.json({ suggestions });
};

const toggleSavePost = async (req, res) => {
  const user = await User.findById(req.user._id);
  const saved = user.savedPosts.some((postId) => postId.equals(req.params.postId));
  user.savedPosts = saved ? user.savedPosts.filter((postId) => !postId.equals(req.params.postId)) : [...user.savedPosts, req.params.postId];
  await user.save();
  res.json({ message: saved ? 'Post removed from saved list' : 'Post saved' });
};

const getSavedPosts = async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedPosts',
    populate: { path: 'author', select: 'name username avatar' },
  });
  res.json({ posts: user.savedPosts });
};

module.exports = {
  getUserByUsername,
  updateProfile,
  updateAvatar,
  followUser,
  unfollowUser,
  acceptFollowRequest,
  deleteFollowRequest,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  toggleSavePost,
  getSavedPosts,
};