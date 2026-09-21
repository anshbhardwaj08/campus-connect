const express = require('express');
const chatController = require('../controllers/chat.controller');
const claimController = require('../controllers/claim.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.startConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.patch('/conversations/:id/read', chatController.markRead);

// The community handshake (lost & found, wanted, carpool): one side asks,
// the owner confirms, and the post closes itself. See
// controllers/claim.controller.js.
router.post('/conversations/:id/claim', claimController.askClaim);
router.patch('/claims/:messageId', claimController.decideClaim);

module.exports = router;
