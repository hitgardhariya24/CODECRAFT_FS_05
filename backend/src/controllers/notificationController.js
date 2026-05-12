const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('actor', 'name username avatar')
    .populate('post', 'text media author')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ notifications });
};

const markAllRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id }, { read: true });
  res.json({ message: 'Notifications marked as read' });
};

const markRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, recipient: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json({ notification });
};

const acceptRequest = async (req, res) => {
  return res.status(400).json({ message: 'Use the follow request acceptance endpoint' });
};

const deleteRequest = async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.notificationId,
    recipient: req.user._id,
    type: { $in: ['follow_request', 'request'] },
  });

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json({ message: 'Notification deleted' });
};

module.exports = { getNotifications, markAllRead, markRead, acceptRequest, deleteRequest };