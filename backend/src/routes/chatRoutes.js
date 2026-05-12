const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getConversations,
  getConversationMessages,
  createOrGetConversation,
  sendMessage,
  markConversationSeen,
} = require('../controllers/chatController');

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, createOrGetConversation);
router.get('/conversations/:conversationId/messages', protect, getConversationMessages);
router.post('/conversations/:conversationId/messages', protect, sendMessage);
router.patch('/conversations/:conversationId/seen', protect, markConversationSeen);

module.exports = router;