const SavedItem = require('../models/SavedItem');
const SavedSearch = require('../models/SavedSearch');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// POST /saved/items
const save = catchAsync(async (req, res) => {
  const { listingId } = req.body;

  const savedItem = await SavedItem.findOneAndUpdate(
    { userId: req.user._id, listingId },
    { userId: req.user._id, listingId },
    { upsert: true, new: true }
  );

  return res.status(201).json(new ApiResponse(201, { savedItem }, 'Listing saved'));
});

// DELETE /saved/items/:listingId
const unsave = catchAsync(async (req, res) => {
  await SavedItem.findOneAndDelete({ userId: req.user._id, listingId: req.params.listingId });
  return res.status(200).json(new ApiResponse(200, null, 'Listing unsaved'));
});

// GET /saved/items
const getMySaved = catchAsync(async (req, res) => {
  const savedItems = await SavedItem.find({ userId: req.user._id }).populate('listingId');
  return res.status(200).json(new ApiResponse(200, { savedItems }, 'Saved items fetched'));
});

// POST /saved/searches
const saveSearch = catchAsync(async (req, res) => {
  const { query, filters } = req.body;
  const savedSearch = await SavedSearch.create({ userId: req.user._id, query, filters });
  return res.status(201).json(new ApiResponse(201, { savedSearch }, 'Search saved'));
});

// GET /saved/searches
const getMySavedSearches = catchAsync(async (req, res) => {
  const savedSearches = await SavedSearch.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { savedSearches }, 'Saved searches fetched'));
});

// DELETE /saved/searches/:id
const deleteSavedSearch = catchAsync(async (req, res) => {
  const savedSearch = await SavedSearch.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!savedSearch) throw new ApiError(404, 'Saved search not found');

  return res.status(200).json(new ApiResponse(200, null, 'Saved search deleted'));
});

module.exports = { save, unsave, getMySaved, saveSearch, getMySavedSearches, deleteSavedSearch };
