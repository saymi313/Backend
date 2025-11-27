const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { emitToUser, isUserOnline } = require('../config/socket');

// Handle typing indicators
const handleTyping = (socket, io) => {
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
};

// Handle message delivery and read receipts
const handleMessageStatus = (socket, io) => {
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
};

// Handle conversation updates
const handleConversationUpdates = (socket, io) => {
  socket.on('conversation:join', ({ conversationId }) => {
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('conversation:leave', ({ conversationId }) => {
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
    socket.leave(`conversation:${conversationId}`);
  });
};

// Handle real-time message sending
const handleMessageSending = (socket, io) => {
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, content, messageType = 'text', replyTo } = data;
      
      // Get conversation to find receiver
      const conversation = await Conversation.findOne({
        conversationId,
        participants: socket.userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Get receiver
      const receiverId = conversation.participants.find(
        p => p.toString() !== socket.userId
      );

      // Create message
      const message = new Message({
        conversationId,
        sender: socket.userId,
        receiver: receiverId,
        content,
        messageType,
        replyTo,
        isDelivered: isUserOnline(receiverId)
      });

      await message.save();
      await message.populate('sender', 'profile.firstName profile.lastName profile.avatar');

      // Update conversation
      conversation.lastMessage = {
        content,
        sender: socket.userId,
        timestamp: new Date(),
        messageType
      };
      await conversation.save();

      // Increment unread for receiver
      await conversation.incrementUnread(receiverId);

      // Emit to sender (confirmation)
      socket.emit('message:sent', {
        message,
        tempId: data.tempId // For optimistic UI updates
      });

      // Emit to receiver
      const emitted = emitToUser(receiverId, 'message:new', {
        message,
        conversation: {
          conversationId,
          lastMessage: conversation.lastMessage
        }
      });

      // Update delivery status
      if (emitted) {
        message.isDelivered = true;
        message.deliveredAt = new Date();
        await message.save();

        socket.emit('message:status', {
          messageId: message._id,
          conversationId,
          status: 'delivered',
          timestamp: message.deliveredAt
        });
      }

      // Emit to conversation room
      io.to(`conversation:${conversationId}`).emit('conversation:updated', {
        conversationId,
        lastMessage: conversation.lastMessage
      });

    } catch (error) {
      console.error('Error sending message via socket:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
};

// Handle user presence
const handleUserPresence = (socket, io) => {
  socket.on('user:status', ({ status }) => {
    console.log(`User ${socket.userId} status: ${status}`);
    socket.broadcast.emit('user:status:changed', {
      userId: socket.userId,
      status,
      timestamp: new Date()
    });
  });
};

// Initialize all socket handlers
const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`📱 Socket handlers initialized for user: ${socket.userId}`);

    // Register all handlers
    handleTyping(socket, io);
    handleMessageStatus(socket, io);
    handleConversationUpdates(socket, io);
    handleMessageSending(socket, io);
    handleUserPresence(socket, io);

    // Handle custom events from mentor/mentee specific handlers
    socket.on('mentor:custom', (data) => {
      console.log('Mentor custom event:', data);
      // Handle mentor-specific events
    });

    socket.on('mentee:custom', (data) => {
      console.log('Mentee custom event:', data);
      // Handle mentee-specific events
    });
  });
};

module.exports = {
  initializeSocketHandlers,
  handleTyping,
  handleMessageStatus,
  handleConversationUpdates,
  handleMessageSending,
  handleUserPresence
};

