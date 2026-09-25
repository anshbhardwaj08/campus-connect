// "Goes with this" — the cross-sell, and the one genuinely RAG-shaped thing
// in this codebase.
//
//   Retrieve   the listings actually on the board right now
//   Augment    put them in the prompt
//   Generate   ask which ones go with this listing, and why
//
// Why it is RAG and not a chatbot: the model is only ever shown real,
// unsold listings, and only ids it was shown are accepted back (see
// `pick` below). It cannot recommend a phone case nobody is selling,
// because it was never told one existed.
//
// Two things that look like details and are not:
//
// 1. **The candidates are NOT the nearest listings.** Nearest-by-embedding
//    finds SUBSTITUTES — other phones — and a cross-sell wants COMPLEMENTS.
//    Using the semantic matcher here would be the obvious move and it would
//    be wrong. The candidate set is a broad slice of the board instead, and
//    the model does the picking.
//
// 2. **Nothing here runs on a request path.** The hourly job calls this and
//    writes the answer onto the listing; the page reads the answer. So a
//    slow model costs nobody anything, and a model that is down costs a
//    little quality rather than a page.

const Listing = require('../models/Listing');
const generator = require('../generators');
const { companionsFor } = require('../matchers/companions');
const { findMatches } = require('../matchers');
const { winstonLogger } = require('../middleware/logger');

// How much of the board the model is shown. Big enough to contain the
// answer on a campus-sized board, small enough to stay a cheap prompt.
const CANDIDATES = 40;

// Four suggestions is a strip, not a wall. More reads as filler.
const MAX_SUGGESTIONS = 4;

// Re-done when the cached answer is older than this, since the board moves
// under it — the case it recommended may have sold.
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['n', 'reason'],
      },
    },
  },
  required: ['picks'],
};

// Numbered, not by id: an ObjectId is 24 characters of noise that the model
// has to copy back perfectly, and getting one character wrong is an invalid
// suggestion. A small integer is hard to get wrong and trivial to check.
const buildPrompt = (listing, candidates) => `\
A student is looking at this listing on a college marketplace in India:

  ${listing.title} — ₹${listing.price}
  ${(listing.description || '').slice(0, 300)}

These are the other things for sale on the board right now:

${candidates.map((c, i) => `  ${i + 1}. ${c.title} — ₹${c.price}`).join('\n')}

Which of those numbered items would genuinely be USEFUL ALONGSIDE the
listing above — things the buyer would plausibly need with it, or that
complete it?

Rules:
- Only pick items that go WITH it. Do not pick alternatives to it: another
  phone is not useful to someone buying a phone.
- Pick at most ${MAX_SUGGESTIONS}. Picking none is a perfectly good answer,
  and is better than a weak one.
- For each pick, give one short reason a student would agree with, under
  fifteen words. Plain and specific, no sales language.
- Answer with numbers from the list only.`;

/**
 * Keeps only picks that refer to a candidate actually shown. This is the
 * guard that makes the feature trustworthy: whatever the model returns,
 * what is stored can only be real listings from the list it was given.
 */
const pick = (picks, candidates) => {
  const out = [];
  const used = new Set();

  for (const p of picks || []) {
    const index = Number(p?.n) - 1;
    const candidate = candidates[index];
    if (!candidate || used.has(index)) continue;
    used.add(index);
    out.push({
      listingId: candidate._id,
      reason: String(p.reason || '').trim().slice(0, 140),
    });
    if (out.length >= MAX_SUGGESTIONS) break;
  }

  return out;
};

/**
 * The fallback: the hand-written companion map, each entry looked up through
 * the ordinary matcher. No model involved, so this is what the feature
 * degrades to — a recommender rather than RAG, which is worth saying plainly
 * because the difference is exactly the model.
 */
const fromMap = async (listing) => {
  const wants = companionsFor(listing, MAX_SUGGESTIONS);
  const out = [];
  const used = new Set([String(listing._id)]);

  for (const want of wants) {
    // Reuses the wanted-board matcher by handing it a request-shaped object.
    // `userId` is the seller, so the matcher's "never your own listing" rule
    // would exclude this seller's other items — which is wrong for a
    // cross-sell, where the same seller's charger is a fine suggestion. A
    // throwaway id sidesteps that without weakening the real rule.
    const matches = await findMatches(
      { title: want.query, description: '', userId: null, _id: listing._id },
      { since: null, limit: 3 }
    );

    const hit = matches.find((m) => !used.has(String(m.listing._id)));
    if (!hit) continue;

    used.add(String(hit.listing._id));
    out.push({ listingId: hit.listing._id, reason: want.reason });
  }

  return out;
};

/**
 * Works out what goes with one listing and writes it onto the listing.
 * @returns {Promise<{ source: 'generated'|'map'|'none', items: Array }>}
 */
const buildFor = async (listing) => {
  const candidates = await Listing.find({
    _id: { $ne: listing._id },
    status: 'active',
  })
    .sort({ createdAt: -1 })
    .limit(CANDIDATES)
    .select('title price')
    .lean();

  let items = [];
  let source = 'none';

  if (candidates.length && generator.isAvailable()) {
    try {
      const answer = await generator.generateJson(buildPrompt(listing, candidates), RESPONSE_SCHEMA);
      items = pick(answer?.picks, candidates);
      if (items.length) source = 'generated';
    } catch (err) {
      winstonLogger.warn(`Cross-sell generator failed for ${listing._id}: ${err.message}`);
    }
  }

  // Nothing generated — either no provider, a failure, or the model
  // genuinely found nothing. The map gets its turn either way.
  if (!items.length) {
    items = await fromMap(listing);
    if (items.length) source = 'map';
  }

  await Listing.updateOne(
    { _id: listing._id },
    { $set: { goesWith: { items, source, at: new Date() } } }
  );

  return { source, items };
};

/**
 * The hourly pass: fills in anything with no cached answer, and refreshes
 * anything gone stale. Capped, because a first run over a large board would
 * otherwise be one long burst of generation.
 */
const runCrossSell = async ({ limit = 25 } = {}) => {
  const stale = new Date(Date.now() - STALE_AFTER_MS);

  const listings = await Listing.find({
    status: 'active',
    $or: [{ goesWith: { $exists: false } }, { 'goesWith.at': { $lt: stale } }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('+goesWith')
    .lean();

  const counts = { generated: 0, map: 0, none: 0 };

  for (const listing of listings) {
    try {
      const { source } = await buildFor(listing);
      counts[source] += 1;
    } catch (err) {
      // One bad listing must not stop the pass.
      winstonLogger.error(`Cross-sell failed for ${listing._id}: ${err.message}`);
    }
  }

  return { checked: listings.length, ...counts, generator: generator.describe().name };
};

/**
 * What the listing page shows. Reads the cached answer and swaps in the
 * listings themselves, dropping any that have since sold — the cache can be
 * up to a week old, and recommending something already gone is worse than
 * recommending nothing.
 */
const goesWithFor = async (listingId) => {
  const listing = await Listing.findById(listingId).select('+goesWith title description').lean();
  if (!listing) return { items: [], missing: [], source: 'none' };

  const cached = listing.goesWith?.items || [];
  let items = [];

  if (cached.length) {
    const live = await Listing.find({
      _id: { $in: cached.map((i) => i.listingId) },
      status: 'active',
    })
      .select('title price images category condition listingType')
      .lean();

    const byId = new Map(live.map((l) => [String(l._id), l]));

    items = cached
      .filter((i) => byId.has(String(i.listingId)))
      .map((i) => ({ listing: byId.get(String(i.listingId)), reason: i.reason }));
  }

  return { items, missing: await missingFor(listing), source: listing.goesWith?.source || 'none' };
};

/**
 * The things that obviously go with this listing and that **nobody is
 * selling**.
 *
 * On a board this size that is the usual case, and it is worth saying out
 * loud rather than rendering an empty section: "nobody has a phone case up"
 * is information, and the offer to post a wanted request turns a dead end
 * into the one thing that fixes it. When somebody does list a case, the
 * wanted matcher tells them.
 *
 * Only ever drawn from the hand-written map, never from the generator — a
 * suggestion to go and ask for something has to be one we are sure makes
 * sense, and the map is the part somebody wrote on purpose.
 */
const missingFor = async (listing, limit = 2) => {
  const out = [];

  for (const want of companionsFor(listing, MAX_SUGGESTIONS)) {
    const matches = await findMatches(
      { title: want.query, description: '', userId: null, _id: listing._id },
      { since: null, limit: 1 }
    );

    // Somebody is selling one. Whether or not it made the suggestions above,
    // it is on the board — so there is nothing to go and ask for.
    if (matches.length) continue;

    out.push({ label: want.label, query: want.query, reason: want.reason });
    if (out.length >= limit) break;
  }

  return out;
};

module.exports = {
  runCrossSell,
  buildFor,
  goesWithFor,
  missingFor,
  fromMap,
  buildPrompt,
  pick,
  MAX_SUGGESTIONS,
};
