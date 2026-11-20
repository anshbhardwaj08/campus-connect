const SavedSearch = require('../models/SavedSearch');
const Listing = require('../models/Listing');
const { createNotification } = require('./notification.service');
// Required as a module, not destructured: the binding stays late, which
// keeps the dependency swappable and the service testable.
const retrieve = require('../matchers/retrieve');

// How many new listings a single alert will mention.
const PER_ALERT = 10;

/**
 * For every saved search, finds listings created since the last
 * notification that match the search's query/filters, and notifies the
 * owning user.
 *
 * The text half used to be `$text: { $search: query }`, which matches whole
 * words only — the exact behaviour `listing.controller.js` has a comment
 * explaining it avoided for browse search. Someone who saved "cycle" was
 * never told about a "Hercules bike", which is the one thing a saved search
 * exists to do. It now goes through `matchers/retrieve`, the same retrieval
 * the wanted board uses.
 *
 * The structured filters still run in the database. Only the free-text part
 * is semantic: a category or a price ceiling is a stated constraint, not a
 * hint, and meaning has nothing to add to it.
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
    };

    let matches;
    if (search.query && search.query.trim()) {
      // Retrieval decides which of the eligible listings actually answer
      // the saved text. An empty result here means either nothing matched
      // or no embedding provider is configured; both mean "say nothing",
      // which is the right outcome for an alert.
      const hits = await retrieve.semanticSearch(search.query, {
        filter: matchQuery,
        limit: PER_ALERT,
      });
      matches = hits.map((h) => h.listing);
    } else {
      // A saved search with filters but no text: every new listing that
      // passes the filters is a match, and there is nothing to retrieve.
      matches = await Listing.find(matchQuery).limit(PER_ALERT);
    }

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
