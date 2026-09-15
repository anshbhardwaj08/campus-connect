const User = require('../models/User');

// The ids of suspended accounts, for keeping their content out of
// everything students browse.
//
// Blocking used to set a flag and nothing else: a suspended seller's
// listings stayed in browse and search, their community posts stayed up,
// and buyers could still open a thread that would never be answered. A ban
// that leaves the shopfront open is not a ban.
//
// Deliberately a live query rather than a cache: a moderator bans someone
// because something is happening now, and content lingering for even a
// cache window is the wrong failure. The set is tiny and the partial index
// on `isBlocked` covers exactly this lookup.
const getBlockedUserIds = async () => {
  const blocked = await User.find({ isBlocked: true }, '_id').lean();
  return blocked.map((u) => u._id);
};

// Convenience for the common shape: `{ $nin: [...] }`, or undefined when
// nobody is blocked, so callers can spread it without adding a pointless
// clause to every query.
const excludeBlocked = async (field) => {
  const ids = await getBlockedUserIds();
  return ids.length ? { [field]: { $nin: ids } } : {};
};

module.exports = { getBlockedUserIds, excludeBlocked };
