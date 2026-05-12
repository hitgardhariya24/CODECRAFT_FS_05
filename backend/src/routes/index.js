const express = require('express');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');
const feedRoutes = require('./feedRoutes');
const notificationRoutes = require('./notificationRoutes');
const chatRoutes = require('./chatRoutes');
const storyRoutes = require('./storyRoutes');
const searchRoutes = require('./searchRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/feed', feedRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chats', chatRoutes);
router.use('/stories', storyRoutes);
router.use('/search', searchRoutes);

module.exports = router;