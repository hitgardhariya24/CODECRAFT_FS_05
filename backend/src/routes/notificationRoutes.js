const express = require('express');
const { protect } = require('../middleware/auth');
const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, markAllRead);
router.patch('/:notificationId/read', protect, markRead);

module.exports = router;