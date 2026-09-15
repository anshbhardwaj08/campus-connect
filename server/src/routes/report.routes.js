const express = require('express');
const reportController = require('../controllers/report.controller');
const validate = require('../middleware/validate');
const { createReportSchema } = require('../validators/report.validator');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

router.post('/', validate(createReportSchema), reportController.submitReport);
router.get('/me', reportController.getMyReports);

module.exports = router;
