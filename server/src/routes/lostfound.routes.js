const express = require('express');
const lostFoundController = require('../controllers/lostfound.controller');
const { verifyAccessToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', lostFoundController.getAll);

router.use(verifyAccessToken);

router.post('/', upload.array('images', 6), lostFoundController.post);
router.patch('/:id/resolve', lostFoundController.markResolved);

module.exports = router;
