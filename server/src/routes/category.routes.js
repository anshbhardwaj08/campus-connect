const express = require('express');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);

module.exports = router;
