const { Server } = require('socket.io');
const User = require('./models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.handshake.auth || {};
    if (userId) {
      socket.join(`user:${userId}`);
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      socket.broadcast.emit('presence:update', { userId, isOnline: true });
    }

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('typing:start', ({ conversationId, userId: typingUserId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId: typingUserId, typing: true });
    });

    socket.on('typing:stop', ({ conversationId, userId: typingUserId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId: typingUserId, typing: false });
    });

    socket.on('disconnect', async () => {
      if (userId) {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit('presence:update', { userId, isOnline: false, lastSeen: new Date() });
      }
    });
  });
};

const emitToUser = (userId, eventName, payload) => {
  if (io) {
    io.to(`user:${userId}`).emit(eventName, payload);
  }
};

const emitToConversation = (conversationId, eventName, payload) => {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(eventName, payload);
  }
};

module.exports = { initializeSocket, emitToUser, emitToConversation };