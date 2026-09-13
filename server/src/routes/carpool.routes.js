const express = require('express');
const carpoolController = require('../controllers/carpool.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', carpoolController.getAll);
router.post('/', verifyAccessToken, carpoolController.post);
router.delete('/:id', verifyAccessToken, carpoolController.delete);

module.exports = router;
