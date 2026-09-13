const express = require('express');
const lookingForController = require('../controllers/lookingfor.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', lookingForController.getAll);
router.post('/', verifyAccessToken, lookingForController.create);
router.patch('/:id/fulfilled', verifyAccessToken, lookingForController.markFulfilled);

module.exports = router;
