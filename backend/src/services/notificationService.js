const Notification = require('../models/Notification');
const { emitToUser } = require('../socket');

const createNotification = async ({ recipient, actor, type, post, comment, conversation, text }) => {
  if (!recipient || !actor) return null;

  const notification = await Notification.create({ recipient, actor, type, post, comment, conversation, text });
  emitToUser(recipient.toString(), 'notification:new', notification);
  return notification;
};

module.exports = { createNotification };