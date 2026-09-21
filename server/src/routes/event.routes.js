const express = require('express');
const validate = require('../middleware/validate');
const { createEventSchema } = require('../validators/community.validator');
const eventController = require('../controllers/event.controller');
const { verifyAccessToken, attachUserIfSignedIn } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public, but richer when signed in: `isGoing` needs to know who is asking.
router.get('/', attachUserIfSignedIn, eventController.getAll);
router.get('/:id', attachUserIfSignedIn, eventController.getById);

router.use(verifyAccessToken);

router.post('/', upload.single('image'), validate(createEventSchema), eventController.create);
router.patch('/:id/rsvp', eventController.rsvp);
router.delete('/:id/rsvp', eventController.cancelRsvp);
router.delete('/:id', eventController.delete);

module.exports = router;
