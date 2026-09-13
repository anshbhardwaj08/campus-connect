const express = require('express');
const reportController = require('../controllers/report.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.post('/', reportController.submitReport);
router.get('/me', reportController.getMyReports);

module.exports = router;
