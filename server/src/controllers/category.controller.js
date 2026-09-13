const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// GET /categories
const getAll = catchAsync(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ order: 1 });
  return res.status(200).json(new ApiResponse(200, { categories }, 'Categories fetched'));
});

// GET /categories/:id
const getById = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  return res.status(200).json(new ApiResponse(200, { category }, 'Category fetched'));
});

module.exports = { getAll, getById };
