const express = require('express');
const validate = require('../middleware/validate');
const { createEventSchema } = require('../validators/community.validator');
const eventController = require('../controllers/event.controller');
const { verifyAccessToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);

router.use(verifyAccessToken);

router.post('/', upload.single('image'), validate(createEventSchema), eventController.create);
router.patch('/:id/rsvp', eventController.rsvp);
router.delete('/:id', eventController.delete);

module.exports = router;
