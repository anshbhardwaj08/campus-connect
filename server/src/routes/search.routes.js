const express = require('express');
const searchController = require('../controllers/search.controller');

const router = express.Router();

router.get('/', searchController.fullTextSearch);
router.get('/filter', searchController.filterListings);
router.get('/trending', searchController.trending);

module.exports = router;
