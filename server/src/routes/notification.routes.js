const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.get('/', notificationController.getAll);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.delete);

module.exports = router;
