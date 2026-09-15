const express = require('express');
const validate = require('../middleware/validate');
const { createCarpoolSchema } = require('../validators/community.validator');
const carpoolController = require('../controllers/carpool.controller');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', carpoolController.getAll);
router.post('/', verifyAccessToken, validate(createCarpoolSchema), carpoolController.post);
router.delete('/:id', verifyAccessToken, carpoolController.delete);

module.exports = router;
