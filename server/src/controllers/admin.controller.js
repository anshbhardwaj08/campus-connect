const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Deal = require('../models/Deal');
const Report = require('../models/Report');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Event = require('../models/Event');
const Review = require('../models/Review');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const SavedItem = require('../models/SavedItem');
const SavedSearch = require('../models/SavedSearch');
const Offer = require('../models/Offer');
const LookingFor = require('../models/LookingFor');
const LostFound = require('../models/LostFound');
const Carpool = require('../models/Carpool');
const { winstonLogger } = require('../middleware/logger');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /admin/stats
const getDashboardStats = catchAsync(async (req, res) => {
  const [totalUsers, totalListings, totalDeals, openReports, activeListings] = await Promise.all([
    User.countDocuments(),
    Listing.countDocuments(),
    Deal.countDocuments({ status: 'completed' }),
    Report.countDocuments({ status: 'open' }),
    Listing.countDocuments({ status: 'active' }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { totalUsers, totalListings, activeListings, totalDeals, openReports },
      'Dashboard stats fetched'
    )
  );
});

// GET /admin/users
const getUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search } = req.query;
  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { collegeEmail: new RegExp(search, 'i') }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { users }, 'Users fetched', buildPagination(page, limit, total)));
});

// GET /admin/users/:id
// UserList's row is a narrow projection for the table; the detail page
// needs the full record — email, phone, role, isBlocked — none of which the
// public `GET /users/:id` returns (that one is deliberately narrow, see
// user.controller.js `getPublicProfile`). `select: false` on passwordHash
// and refreshToken keeps those out without doing anything here.
const getUserById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, { user }, 'User fetched'));
});

// DELETE /admin/users/:id
//
// The destructive one: removes the account AND everything of theirs the
// student side would otherwise keep rendering — listings, deals, reviews,
// chats, community posts, saved items, notifications.
//
// Deliberately NOT reversible and deliberately admin-only (a moderator can
// ban, which is the recoverable version of this). Two things it refuses
// outright: deleting yourself, and deleting another admin.
//
// Shared records go with it. A conversation or a deal belongs to two
// people, so deleting one side removes the other side's copy too — there
// is no version of "delete all their data" that leaves a half a chat
// behind. The UI says so before it asks you to confirm.
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (String(id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account from here');
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(403, 'Admin accounts cannot be deleted from here');

  // Their listings, and anything of anyone's that pointed at them.
  const listingIds = (await Listing.find({ sellerId: id }, '_id')).map((l) => l._id);
  const conversationIds = (await Conversation.find({ participants: id }, '_id')).map((c) => c._id);

  const [
    listings,
    deals,
    reviews,
    conversations,
    messages,
    savedByThem,
    savedOfTheirs,
    savedSearches,
    offers,
    lookingFor,
    lostFound,
    carpools,
    events,
    reports,
    notifications,
  ] = await Promise.all([
    Listing.deleteMany({ sellerId: id }),
    Deal.deleteMany({ $or: [{ buyerId: id }, { sellerId: id }] }),
    Review.deleteMany({ $or: [{ reviewerId: id }, { revieweeId: id }] }),
    Conversation.deleteMany({ participants: id }),
    Message.deleteMany({ $or: [{ conversationId: { $in: conversationIds } }, { senderId: id }] }),
    SavedItem.deleteMany({ userId: id }),
    // Other people's saves that pointed at listings which no longer exist.
    SavedItem.deleteMany({ listingId: { $in: listingIds } }),
    SavedSearch.deleteMany({ userId: id }),
    Offer.deleteMany({ $or: [{ buyerId: id }, { sellerId: id }] }),
    LookingFor.deleteMany({ userId: id }),
    LostFound.deleteMany({ userId: id }),
    Carpool.deleteMany({ userId: id }),
    Event.deleteMany({ organizerId: id }),
    // Reports they filed, and reports filed about them. Reports they
    // resolved as a moderator stay — that is someone else's case file; only
    // the `resolvedBy` reference is left dangling.
    Report.deleteMany({ $or: [{ reporterId: id }, { targetType: 'user', targetId: id }] }),
    Notification.deleteMany({ userId: id }),
  ]);

  await User.findByIdAndDelete(id);

  const removed = {
    listings: listings.deletedCount,
    deals: deals.deletedCount,
    reviews: reviews.deletedCount,
    conversations: conversations.deletedCount,
    messages: messages.deletedCount,
    savedItems: savedByThem.deletedCount + savedOfTheirs.deletedCount,
    savedSearches: savedSearches.deletedCount,
    offers: offers.deletedCount,
    communityPosts: lookingFor.deletedCount + lostFound.deletedCount + carpools.deletedCount,
    events: events.deletedCount,
    reports: reports.deletedCount,
    notifications: notifications.deletedCount,
  };

  winstonLogger.warn(
    `Admin ${req.user.collegeEmail} deleted user ${user.collegeEmail} (${id}): ${JSON.stringify(removed)}`
  );

  return res.status(200).json(new ApiResponse(200, { removed, name: user.name }, 'User and their data deleted'));
});

// PATCH /admin/users/:id/ban
//
// Banning takes the account off the page properly: their listings,
// community posts and events stop being served to anyone, and nobody can
// open a new thread with them. See utils/blockedUsers.js.
const banUser = catchAsync(async (req, res) => {
  const reason = (req.body?.reason || '').trim();

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true, banReason: reason || undefined },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found');

  winstonLogger.warn(
    `Admin ${req.user.collegeEmail} banned ${user.collegeEmail}${reason ? `: ${reason}` : ' (no reason given)'}`
  );

  return res.status(200).json(new ApiResponse(200, { user }, 'User banned'));
});

// PATCH /admin/users/:id/unban
const unbanUser = catchAsync(async (req, res) => {
  // The reason goes with the suspension it belonged to — leaving it behind
  // would show a stale explanation the next time anyone is banned.
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false, $unset: { banReason: 1 } },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, { user }, 'User unbanned'));
});

// GET /admin/listings
// `sellerId` is optional — UserDetail uses it to show everything one seller
// has ever posted, unlike the public `GET /users/:id/listings`, which only
// returns active/sold (a stranger has no business seeing someone's rejected
// or expired listings; an admin reviewing a seller's history does).
const getListings = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status, sellerId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (sellerId) filter.sellerId = sellerId;

  const [listings, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('sellerId', 'name collegeEmail'),
    Listing.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Listings fetched', buildPagination(page, limit, total)));
});

// PATCH /admin/listings/:id/approve
const approveListing = catchAsync(async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing approved'));
});

// PATCH /admin/listings/:id/reject
const rejectListing = catchAsync(async (req, res) => {
  const { rejectionReason } = req.body;
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectionReason },
    { new: true }
  );
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing rejected'));
});

// GET /admin/deals
// No admin deals endpoint existed at all — AllDeals had nothing to call.
// `userId` is optional (matches `getMyDeals`'s `$or` shape) so UserDetail
// can reuse this for "their deals" instead of a second endpoint.
const getDeals = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status, userId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.$or = [{ buyerId: userId }, { sellerId: userId }];

  const [deals, total] = await Promise.all([
    Deal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('listingId', 'title images price')
      .populate('buyerId', 'name collegeEmail')
      .populate('sellerId', 'name collegeEmail'),
    Deal.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { deals }, 'Deals fetched', buildPagination(page, limit, total)));
});

// GET /admin/events
const getEvents = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const [events, total] = await Promise.all([
    Event.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizerId', 'name collegeEmail'),
    Event.countDocuments(),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { events }, 'Events fetched', buildPagination(page, limit, total)));
});

// DELETE /admin/events/:id
// `DELETE /events/:id` on the student side is organizer-scoped — an
// organiser calling off their own event. This is the moderation override:
// no organizerId check, because the whole point is cancelling someone
// else's event.
const cancelEvent = catchAsync(async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');

  return res.status(200).json(new ApiResponse(200, null, 'Event cancelled'));
});

// GET /admin/reports
const getReports = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status } = req.query;
  const filter = status ? { status } : {};

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'name collegeEmail')
      .lean(),
    Report.countDocuments(filter),
  ]);

  // `targetId` can point at a listing, a user or a message, so no single
  // populate reaches it — and a moderator looking at a bare ObjectId cannot
  // act on the report at all. Resolve each type in one query and attach a
  // label. A null label means the target is already gone, which is itself
  // worth seeing.
  const idsByType = { listing: [], user: [], message: [] };
  reports.forEach((r) => idsByType[r.targetType]?.push(r.targetId));

  const [listings, users, messages] = await Promise.all([
    Listing.find({ _id: { $in: idsByType.listing } }, 'title').lean(),
    User.find({ _id: { $in: idsByType.user } }, 'name collegeEmail').lean(),
    Message.find({ _id: { $in: idsByType.message } }, 'text').lean(),
  ]);

  const labels = new Map();
  listings.forEach((l) => labels.set(String(l._id), l.title));
  users.forEach((u) => labels.set(String(u._id), `${u.name} (${u.collegeEmail})`));
  messages.forEach((m) => labels.set(String(m._id), m.text ? `"${m.text.slice(0, 80)}"` : 'A message'));

  reports.forEach((r) => {
    r.targetLabel = labels.get(String(r.targetId)) || null;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { reports }, 'Reports fetched', buildPagination(page, limit, total)));
});

// PATCH /admin/reports/:id/resolve
const resolveReport = catchAsync(async (req, res) => {
  const { adminNote, status = 'resolved' } = req.body;

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status, adminNote, resolvedBy: req.user._id },
    { new: true }
  );
  if (!report) throw new ApiError(404, 'Report not found');

  return res.status(200).json(new ApiResponse(200, { report }, 'Report updated'));
});

// POST /admin/notifications/broadcast
const broadcastNotif = catchAsync(async (req, res) => {
  const { title, message, link } = req.body;

  const users = await User.find({}, '_id');
  const notifications = users.map((user) => ({
    userId: user._id,
    type: 'broadcast',
    title,
    message,
    link,
  }));

  await Notification.insertMany(notifications);

  return res.status(201).json(new ApiResponse(201, { count: notifications.length }, 'Broadcast sent'));
});

// GET /admin/logs
const getLogs = catchAsync(async (req, res) => {
  const logPath = path.join('logs', 'combined.log');
  if (!fs.existsSync(logPath)) {
    return res.status(200).json(new ApiResponse(200, { logs: [] }, 'No logs found'));
  }

  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').slice(-200);
  const logs = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return res.status(200).json(new ApiResponse(200, { logs }, 'Logs fetched'));
});

// GET /admin/categories
const getCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ order: 1 });
  return res.status(200).json(new ApiResponse(200, { categories }, 'Categories fetched'));
});

// POST /admin/categories
// Used to spread `req.body` straight into `Category.create` — the request
// now runs through `createCategorySchema` (see admin.routes.js), so this is
// already the validated, allow-listed value.
const createCategory = catchAsync(async (req, res) => {
  const category = await Category.create(req.body);
  return res.status(201).json(new ApiResponse(201, { category }, 'Category created'));
});

module.exports = {
  getDashboardStats,
  getUsers,
  getUserById,
  deleteUser,
  banUser,
  unbanUser,
  getListings,
  approveListing,
  rejectListing,
  getDeals,
  getEvents,
  cancelEvent,
  getReports,
  resolveReport,
  broadcastNotif,
  getLogs,
  getCategories,
  createCategory,
};
