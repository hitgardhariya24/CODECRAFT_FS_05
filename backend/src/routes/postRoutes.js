const express = require('express');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
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
  repostPost,
} = require('../controllers/postController');

const router = express.Router();

router.post('/', protect, upload.array('media', 10), createPost);
router.get('/trending', protect, getTrendingPosts);
router.get('/:postId', protect, getPostById);
router.patch('/:postId', protect, upload.array('media', 10), updatePost);
router.delete('/:postId', protect, deletePost);
router.post('/:postId/like', protect, toggleLike);
router.post('/:postId/repost', protect, repostPost);
router.get('/:postId/comments', protect, getCommentsForPost);
router.post('/:postId/comments', protect, addComment);
router.patch('/comments/:commentId', protect, updateComment);
router.delete('/comments/:commentId', protect, deleteComment);
router.post('/comments/:commentId/reactions', protect, reactToComment);

module.exports = router;