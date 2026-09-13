const express = require('express');
const chatController = require('../controllers/chat.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.patch('/conversations/:id/read', chatController.markRead);

module.exports = router;
