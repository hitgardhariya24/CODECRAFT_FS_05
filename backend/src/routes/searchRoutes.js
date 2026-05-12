const express = require('express');
const { protect } = require('../middleware/auth');
const { searchUsers, searchPosts, searchHashtags, getSearchSuggestions } = require('../controllers/searchController');

const router = express.Router();

router.get('/users', protect, searchUsers);
router.get('/posts', protect, searchPosts);
router.get('/hashtags', protect, searchHashtags);
router.get('/suggestions', protect, getSearchSuggestions);

module.exports = router;