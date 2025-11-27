const express = require('express');
const router = express.Router();
const {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  deleteMessage,
  deleteAllMessages,
  updateConversationSettings,
  markMessagesAsRead
} = require('../controllers/chatController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all conversations for current user
router.get('/conversations', getUserConversations);

// Create or get conversation with a participant (POST method for body)
router.post('/conversations', getOrCreateConversation);

// Get or create conversation with a participant (GET method for URL param)
router.get('/conversations/:participantId', getOrCreateConversation);

// Update conversation settings (pin, mute, archive)
router.put('/conversations/:conversationId/settings', updateConversationSettings);

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', getConversationMessages);

// Delete all messages in a conversation (clear chat)
router.delete('/conversations/:conversationId/messages', deleteAllMessages);

// Mark messages as read
router.put('/conversations/:conversationId/read', markMessagesAsRead);

// Send a message
router.post('/messages', sendMessage);

// Delete a single message
router.delete('/messages/:messageId', deleteMessage);

module.exports = router;

