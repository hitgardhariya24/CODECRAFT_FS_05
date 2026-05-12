const express = require('express');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { createStory, getStories, viewStory, reactToStory, deleteExpiredStories } = require('../controllers/storyController');

const router = express.Router();

router.post('/', protect, upload.single('storyMedia'), createStory);
router.get('/', protect, getStories);
router.post('/:storyId/view', protect, viewStory);
router.post('/:storyId/react', protect, reactToStory);
router.delete('/cleanup', protect, deleteExpiredStories);

module.exports = router;