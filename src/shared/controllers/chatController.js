const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/helpers/responseHelpers');
const { emitToUser, isUserOnline } = require('../config/socket');

// Get or create conversation between two users
const getOrCreateConversation = async (req, res) => {
  try {
    // Accept participantId from either params (GET) or body (POST)
    const participantId = req.params.participantId || req.body.participantId;
    const currentUserId = req.user.id;

    if (!participantId) {
      return sendErrorResponse(res, 'Participant ID is required', 400);
    }

    // Check if participant exists
    const participant = await User.findById(participantId).select('profile.firstName profile.lastName profile.avatar role');
    if (!participant) {
      return sendErrorResponse(res, 'Participant not found', 404);
    }

    // Generate conversation ID
    const conversationId = Message.generateConversationId(currentUserId, participantId);

    // Find or create conversation
    let conversation = await Conversation.findOne({ conversationId })
      .populate('participants', 'profile.firstName profile.lastName profile.avatar role email');

    if (!conversation) {
      conversation = new Conversation({
        conversationId,
        participants: [currentUserId, participantId],
        unreadCount: [
          { userId: currentUserId, count: 0 },
          { userId: participantId, count: 0 }
        ]
      });
      await conversation.save();
      await conversation.populate('participants', 'profile.firstName profile.lastName profile.avatar role email');
    }

    return sendSuccessResponse(res, 'Conversation retrieved successfully', {
      conversationId: conversation.conversationId,
      conversation,
      participantOnline: isUserOnline(participantId)
    });
  } catch (error) {
    console.error('Get/Create conversation error:', error);
    return sendErrorResponse(res, 'Failed to get conversation', 500);
  }
};

// Get all conversations for current user
const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { archived = false } = req.query;
    
    console.log('📋 Fetching conversations for user:', currentUserId);

    const query = {
      participants: currentUserId
    };

    if (archived === 'true') {
      query.isArchived = currentUserId;
    } else {
      query.isArchived = { $ne: currentUserId };
    }

    const conversations = await Conversation.find(query)
      .populate('participants', 'profile.firstName profile.lastName profile.avatar role email')
      .populate('lastMessage.sender', 'profile.firstName profile.lastName')
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });
    
    console.log('📋 Found conversations:', conversations.length);

    // Add online status and format data
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p._id.toString() !== currentUserId);
      const myUnread = conv.unreadCount.find(u => u.userId.toString() === currentUserId);
      
      return {
        _id: conv._id,
        conversationId: conv.conversationId,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        unreadCount: myUnread ? myUnread.count : 0,
        isPinned: conv.isPinned.includes(currentUserId),
        isMuted: conv.isMuted.includes(currentUserId),
        isBlocked: conv.isBlocked,
        isArchived: conv.isArchived.includes(currentUserId),
        isOnline: isUserOnline(otherParticipant._id),
        updatedAt: conv.updatedAt
      };
    });

    return sendSuccessResponse(res, 'Conversations retrieved successfully', {
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return sendErrorResponse(res, 'Failed to retrieve conversations', 500);
  }
};

// Get messages in a conversation
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of conversation
    const conversation = await Conversation.findOne({
      conversationId,
      participants: currentUserId
    });

    if (!conversation) {
      return sendErrorResponse(res, 'Conversation not found', 404);
    }

    // Get messages
    const messages = await Message.find({
      conversationId,
      deletedBy: { $ne: currentUserId }
    })
      .populate('sender', 'profile.firstName profile.lastName profile.avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      conversationId,
      deletedBy: { $ne: currentUserId }
    });

    // Mark unread messages as read
    const markResult = await Message.updateMany(
      {
        conversationId,
        receiver: currentUserId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );
    
    console.log(`👁️ Marked ${markResult.modifiedCount} messages as read for user:`, currentUserId);

    // Reset unread count
    await conversation.resetUnread(currentUserId);

    // Emit read receipts to sender
    const otherParticipant = conversation.participants.find(
      p => p.toString() !== currentUserId
    );
    if (otherParticipant) {
      console.log('👁️ Emitting messages:read to:', otherParticipant.toString());
      const emitted = emitToUser(otherParticipant, 'messages:read', {
        conversationId,
        readBy: currentUserId
      });
      console.log('👁️ Read receipt emitted:', emitted ? 'YES' : 'NO (user offline)');
    }

    return sendSuccessResponse(res, 'Messages retrieved successfully', {
      messages: messages.reverse(),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return sendErrorResponse(res, 'Failed to retrieve messages', 500);
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text', replyTo } = req.body;
    const currentUserId = req.user.id;

    if (!conversationId || !content) {
      return sendErrorResponse(res, 'Conversation ID and content are required', 400);
    }

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findOne({
      conversationId,
      participants: currentUserId
    });

    if (!conversation) {
      return sendErrorResponse(res, 'Conversation not found', 404);
    }

    // Get receiver
    const receiverId = conversation.participants.find(
      p => p.toString() !== currentUserId
    );

    // Create message
    const message = new Message({
      conversationId,
      sender: currentUserId,
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
      sender: currentUserId,
      timestamp: new Date(),
      messageType
    };
    await conversation.save();

    // Increment unread for receiver
    await conversation.incrementUnread(receiverId);

    // Emit to receiver via socket
    console.log('📤 Emitting message:new to receiver:', receiverId);
    console.log('📤 Message content:', content);
    console.log('📤 ConversationId:', conversationId);
    
    const emitted = emitToUser(receiverId, 'message:new', {
      message,
      conversation: {
        conversationId,
        lastMessage: conversation.lastMessage
      }
    });

    console.log('📤 Message emitted:', emitted ? 'YES (user online)' : 'NO (user offline)');

    // If delivered, mark as such
    if (emitted) {
      message.isDelivered = true;
      message.deliveredAt = new Date();
      await message.save();
    }

    // Get sender's info for notification
    const sender = await User.findById(currentUserId).select('profile.firstName profile.lastName profile.avatar role');
    const senderName = sender ? `${sender.profile.firstName} ${sender.profile.lastName}`.trim() : 'Someone';
    
    // Get receiver's info to determine the correct action URL
    const receiver = await User.findById(receiverId).select('role');
    const actionUrl = receiver?.role === 'mentor' ? '/mentor/chats' : '/mentees/chats';
    
    // Create notification for receiver
    const notification = await Notification.create({
      userId: receiverId,
      type: 'message_received',
      title: `New message from ${senderName}`,
      message: content.length > 50 ? content.substring(0, 50) + '...' : content,
      data: {
        conversationId: conversationId,
        messageId: message._id,
        senderId: currentUserId,
        senderName: senderName,
        senderAvatar: sender?.profile?.avatar || null
      },
      priority: 'medium',
      actionUrl: actionUrl,
      actionText: 'View Message'
    });
    
    console.log('🔔 Notification created for user:', receiverId);
    
    // Emit notification via socket
    const notificationEmitted = emitToUser(receiverId, 'notification:new', {
      notification: notification.toJSON()
    });
    
    console.log('🔔 Notification emitted:', notificationEmitted ? 'YES' : 'NO');

    return sendSuccessResponse(res, 'Message sent successfully', { message });
  } catch (error) {
    console.error('Send message error:', error);
    return sendErrorResponse(res, 'Failed to send message', 500);
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;
    const { deleteForEveryone = false } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return sendErrorResponse(res, 'Message not found', 404);
    }

    if (deleteForEveryone) {
      // Only sender can delete for everyone within 1 hour
      if (message.sender.toString() !== currentUserId) {
        return sendErrorResponse(res, 'Only sender can delete for everyone', 403);
      }

      const hourInMs = 60 * 60 * 1000;
      if (Date.now() - message.createdAt.getTime() > hourInMs) {
        return sendErrorResponse(res, 'Can only delete for everyone within 1 hour', 400);
      }

      message.isDeleted = true;
      message.content = 'This message was deleted';
      await message.save();

      // Notify receiver
      emitToUser(message.receiver, 'message:deleted', {
        messageId,
        conversationId: message.conversationId
      });
    } else {
      // Delete for self
      if (!message.deletedBy.includes(currentUserId)) {
        message.deletedBy.push(currentUserId);
        await message.save();
      }
    }

    return sendSuccessResponse(res, 'Message deleted successfully');
  } catch (error) {
    console.error('Delete message error:', error);
    return sendErrorResponse(res, 'Failed to delete message', 500);
  }
};

// Update conversation settings
const updateConversationSettings = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const { isPinned, isMuted, isArchived } = req.body;

    const conversation = await Conversation.findOne({
      conversationId,
      participants: currentUserId
    });

    if (!conversation) {
      return sendErrorResponse(res, 'Conversation not found', 404);
    }

    // Update settings
    if (typeof isPinned === 'boolean') {
      if (isPinned && !conversation.isPinned.includes(currentUserId)) {
        conversation.isPinned.push(currentUserId);
      } else if (!isPinned) {
        conversation.isPinned = conversation.isPinned.filter(
          id => id.toString() !== currentUserId
        );
      }
    }

    if (typeof isMuted === 'boolean') {
      if (isMuted && !conversation.isMuted.includes(currentUserId)) {
        conversation.isMuted.push(currentUserId);
      } else if (!isMuted) {
        conversation.isMuted = conversation.isMuted.filter(
          id => id.toString() !== currentUserId
        );
      }
    }

    if (typeof isArchived === 'boolean') {
      if (isArchived && !conversation.isArchived.includes(currentUserId)) {
        conversation.isArchived.push(currentUserId);
      } else if (!isArchived) {
        conversation.isArchived = conversation.isArchived.filter(
          id => id.toString() !== currentUserId
        );
      }
    }

    await conversation.save();

    return sendSuccessResponse(res, 'Conversation settings updated successfully', {
      conversation
    });
  } catch (error) {
    console.error('Update conversation settings error:', error);
    return sendErrorResponse(res, 'Failed to update conversation settings', 500);
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    await Message.updateMany(
      {
        conversationId,
        receiver: currentUserId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    const conversation = await Conversation.findOne({ conversationId });
    if (conversation) {
      await conversation.resetUnread(currentUserId);

      // Notify sender
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== currentUserId
      );
      if (otherParticipant) {
        emitToUser(otherParticipant, 'messages:read', {
          conversationId,
          readBy: currentUserId
        });
      }
    }

    return sendSuccessResponse(res, 'Messages marked as read');
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return sendErrorResponse(res, 'Failed to mark messages as read', 500);
  }
};

// Delete all messages in a conversation (clear chat)
const deleteAllMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({ 
      conversationId,
      participants: currentUserId 
    });

    if (!conversation) {
      return sendErrorResponse(res, 'Conversation not found or unauthorized', 404);
    }

    // Delete all messages in the conversation
    const result = await Message.deleteMany({ conversationId });

    console.log(`Deleted ${result.deletedCount} messages from conversation ${conversationId}`);

    // Update conversation to clear last message
    conversation.lastMessage = null;
    await conversation.save();

    return sendSuccessResponse(res, 'All messages deleted successfully', {
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all messages error:', error);
    return sendErrorResponse(res, 'Failed to delete messages', 500);
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  deleteMessage,
  deleteAllMessages,
  updateConversationSettings,
  markMessagesAsRead
};

