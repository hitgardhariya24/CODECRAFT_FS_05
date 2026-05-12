const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { emitToConversation, emitToUser } = require('../socket');
const { createNotification } = require('../services/notificationService');

const getConversationParticipants = async (conversation, userId) =>
  User.find({ _id: { $in: conversation.participants.filter((participant) => !participant.equals(userId)) } }).select('name username avatar isOnline lastSeen');

const getConversations = async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .populate('participants', 'name username avatar isOnline lastSeen')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

  res.json({ conversations });
};

const createOrGetConversation = async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId) return res.status(400).json({ message: 'recipientId is required' });

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, recipientId], $size: 2 },
  }).populate('participants', 'name username avatar isOnline lastSeen');

  if (!conversation) {
    conversation = await Conversation.create({ participants: [req.user._id, recipientId] });
    conversation = await conversation.populate('participants', 'name username avatar isOnline lastSeen');
  }

  res.json({ conversation });
};

const getConversationMessages = async (req, res) => {
  const messages = await Message.find({ conversation: req.params.conversationId })
    .populate('sender', 'name username avatar isOnline')
    .sort({ createdAt: 1 });
  res.json({ messages });
};

const sendMessage = async (req, res) => {
  const { text = '', media = [] } = req.body;
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text,
    media,
    seenBy: [req.user._id],
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate('sender', 'name username avatar isOnline');
  emitToConversation(conversation._id.toString(), 'message:new', populatedMessage);

  const recipientId = conversation.participants.find((participant) => !participant.equals(req.user._id));
  if (recipientId) {
    emitToUser(recipientId.toString(), 'message:new', populatedMessage);
    await createNotification({
      recipient: recipientId,
      actor: req.user._id,
      type: 'message',
      conversation: conversation._id,
      text: `${req.user.username || 'Someone'} sent you a message`,
    });
  }

  res.status(201).json({ message: populatedMessage });
};

const markConversationSeen = async (req, res) => {
  await Message.updateMany(
    { conversation: req.params.conversationId, sender: { $ne: req.user._id } },
    { $addToSet: { seenBy: req.user._id } }
  );
  emitToConversation(req.params.conversationId, 'message:seen', { userId: req.user._id });
  res.json({ message: 'Conversation marked as seen' });
};

module.exports = {
  getConversations,
  createOrGetConversation,
  getConversationMessages,
  sendMessage,
  markConversationSeen,
};