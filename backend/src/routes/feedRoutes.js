const express = require('express');
const { protect } = require('../middleware/auth');
const { getHomeFeed, getFollowingFeed, getExploreFeed } = require('../controllers/feedController');

const router = express.Router();

router.get('/home', protect, getHomeFeed);
router.get('/following', protect, getFollowingFeed);
router.get('/explore', protect, getExploreFeed);

module.exports = router;