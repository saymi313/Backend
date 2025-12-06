const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Store active socket connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

let io = null;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      const JWT_SECRET = process.env.JWT_SECRET;
      
      console.log('🔐 Socket auth attempt - Token preview:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      
      if (!token) {
        console.error('❌ No token provided in socket handshake');
        return next(new Error('Authentication error: No token provided'));
      }

      if (!JWT_SECRET) {
        console.error('❌ JWT_SECRET is not defined in environment');
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded successfully:', decoded.id, decoded.email);
      
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.error('❌ User not found in database:', decoded.id);
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.user = user;
      
      console.log('✅ Socket authenticated for user:', user.email, '(', user.role, ')');
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error.message);
      console.error('Error type:', error.name);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);
    
    // Store user socket connection
    activeUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);
    
    // Notify user is online
    socket.broadcast.emit('user:online', { userId: socket.userId });

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle user going offline
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      
      activeUsers.delete(socket.userId);
      userSockets.delete(socket.id);
      
      // Notify user is offline
      socket.broadcast.emit('user:offline', { userId: socket.userId });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    // Handle typing indicators
    socket.on('typing:start', ({ conversationId, receiverId }) => {
      console.log(`User ${socket.userId} started typing in ${conversationId}`);
      emitToUser(receiverId, 'typing:start', {
        conversationId,
        userId: socket.userId
      });
    });

    socket.on('typing:stop', ({ conversationId, receiverId }) => {
      console.log(`User ${socket.userId} stopped typing in ${conversationId}`);
      emitToUser(receiverId, 'typing:stop', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle message delivery and read receipts
    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && !message.isDelivered) {
          message.isDelivered = true;
          message.deliveredAt = new Date();
          await message.save();

          // Notify sender
          emitToUser(message.sender.toString(), 'message:status', {
            messageId,
            conversationId,
            status: 'delivered',
            timestamp: message.deliveredAt
          });
        }
      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    socket.on('message:read', async ({ messageId, conversationId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && !message.isRead) {
          await message.markAsRead();

          // Notify sender
          emitToUser(message.sender.toString(), 'message:status', {
            messageId,
            conversationId,
            status: 'read',
            timestamp: message.readAt
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle conversation room joining (for future use)
    socket.on('conversation:join', ({ conversationId }) => {
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', ({ conversationId }) => {
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
      socket.leave(`conversation:${conversationId}`);
    });

    // Handle user status updates
    socket.on('user:status', ({ status }) => {
      console.log(`User ${socket.userId} status: ${status}`);
      socket.broadcast.emit('user:status:changed', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    });
  });

  console.log('🚀 Socket.IO initialized successfully');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

const getActiveUsers = () => {
  return Array.from(activeUsers.keys());
};

const isUserOnline = (userId) => {
  return activeUsers.has(userId.toString());
};

const getUserSocketId = (userId) => {
  return activeUsers.get(userId.toString());
};

const emitToUser = (userId, event, data) => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized. Cannot emit to user.');
    return false;
  }
  const userIdStr = userId.toString();
  const socketId = getUserSocketId(userIdStr);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  // Also try emitting to user's personal room as fallback
  io.to(`user:${userIdStr}`).emit(event, data);
  return false; // User might be offline, but we tried
};

const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
    return true;
  }
  return false;
};

module.exports = {
  initializeSocket,
  getIO,
  getActiveUsers,
  isUserOnline,
  getUserSocketId,
  emitToUser,
  emitToRoom,
  activeUsers,
  userSockets
};

