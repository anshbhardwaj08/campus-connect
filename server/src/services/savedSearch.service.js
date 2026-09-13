const SavedSearch = require('../models/SavedSearch');
const Listing = require('../models/Listing');
const { createNotification } = require('./notification.service');

/**
 * For every saved search, finds listings created since the last notification
 * that match the search's query/filters, and notifies the owning user.
 */
const runSavedSearchAlerts = async () => {
  const savedSearches = await SavedSearch.find({});
  let notified = 0;

  for (const search of savedSearches) {
    const since = search.lastNotifiedAt || search.createdAt;
    const filters = search.filters || {};

    const matchQuery = {
      status: 'active',
      createdAt: { $gt: since },
      ...(filters.category && { category: filters.category }),
      ...(filters.condition && { condition: filters.condition }),
      ...(filters.minPrice || filters.maxPrice
        ? {
            price: {
              ...(filters.minPrice && { $gte: filters.minPrice }),
              ...(filters.maxPrice && { $lte: filters.maxPrice }),
            },
          }
        : {}),
      ...(search.query && { $text: { $search: search.query } }),
    };

    const matches = await Listing.find(matchQuery).limit(10);

    if (matches.length > 0) {
      await createNotification({
        userId: search.userId,
        type: 'saved_search_match',
        title: 'New listings match your saved search',
        message: `${matches.length} new listing(s) match "${search.query}"`,
        link: `/browse?savedSearch=${search._id}`,
      });

      search.lastNotifiedAt = new Date();
      await search.save();
      notified += 1;
    }
  }

  return { checked: savedSearches.length, notified };
};

module.exports = { runSavedSearchAlerts };
