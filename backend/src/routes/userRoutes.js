const express = require('express');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
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
} = require('../controllers/userController');

const router = express.Router();

router.get('/suggestions', protect, getSuggestedUsers);
router.get('/:username', protect, getUserByUsername);
router.patch('/profile', protect, updateProfile);
router.patch('/avatar', protect, upload.single('avatar'), updateAvatar);
router.post('/:username/follow', protect, followUser);
router.post('/:username/unfollow', protect, unfollowUser);
router.post('/follow-requests/:notificationId/accept', protect, acceptFollowRequest);
router.delete('/follow-requests/:notificationId', protect, deleteFollowRequest);
router.get('/:username/followers', protect, getFollowers);
router.get('/:username/following', protect, getFollowing);
router.post('/saved/:postId', protect, toggleSavePost);
router.get('/saved/list', protect, getSavedPosts);

module.exports = router;