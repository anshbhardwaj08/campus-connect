const LookingFor = require('../models/LookingFor');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');
const { excludeBlocked } = require('../utils/blockedUsers');

// POST /lookingfor
const create = catchAsync(async (req, res) => {
  // Cloudinary URLs, not the client's word for them — `images` is deliberately
  // absent from the validator, so the only way a photo gets onto a want is
  // through multer having actually uploaded one.
  const images = (req.files || []).map((file) => file.path);
  const post = await LookingFor.create({ ...req.body, images, userId: req.user._id });
  return res.status(201).json(new ApiResponse(201, { post }, 'Request posted'));
});

// Narrowing by type is an allow-list, not a pass-through: `listingType` goes
// straight into a Mongo filter, and `?listingType[$ne]=x` would otherwise be
// a query somebody else wrote. express-mongo-sanitize strips `$` keys, but
// not being able to name the values is the stronger guarantee.
const LISTING_TYPES = ['sale', 'rent'];

// GET /lookingfor
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { category, listingType } = req.query;

  // Posts written before `listingType` existed have no field to match, and a
  // plain equality check would hide them from the "to buy" tab — which is
  // what they are. `$ne: 'rent'` is the same question asked so that a
  // missing field counts as a sale, the way the matcher reads it.
  const byType =
    listingType === 'sale'
      ? { listingType: { $ne: 'rent' } }
      : LISTING_TYPES.includes(listingType)
        ? { listingType }
        : {};

  // Suspended posters come off the board with everything else of theirs.
  const filter = {
    status: 'open',
    ...(category && { category }),
    ...byType,
    ...(await excludeBlocked('userId')),
  };

  const [posts, total] = await Promise.all([
    LookingFor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name avatar'),
    LookingFor.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { posts }, 'Requests fetched', buildPagination(page, limit, total)));
});

// PATCH /lookingfor/:id/fulfilled
const markFulfilled = catchAsync(async (req, res) => {
  const post = await LookingFor.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { status: 'fulfilled' },
    { new: true }
  );
  if (!post) throw new ApiError(404, 'Request not found');

  return res.status(200).json(new ApiResponse(200, { post }, 'Marked as fulfilled'));
});

module.exports = { create, getAll, markFulfilled };
