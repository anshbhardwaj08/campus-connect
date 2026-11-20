// Semantic retrieval over an arbitrary set of listings.
//
// `semantic.matcher.js` answers one question — "which listings answer this
// wanted post?" — and its candidate rules are built around that: the
// asker's own listings are excluded, a stated budget filters. Browse search
// and saved-search alerts ask the same *kind* of question over a different
// set, so they get the retrieval machinery without those rules.
//
// What lives here is only the part all three share: turn a piece of text
// into a vector, compare it against listing vectors, return the ones above
// a threshold, best first. Who is eligible is the caller's business, passed
// in as a plain Mongo filter.
//
// This is retrieval, not RAG. Nothing here generates anything — it is
// embeddings and cosine distance. The one piece of real RAG in the product
// is `services/crossSell.service.js`, which puts retrieved listings into a
// prompt and has a model pick from them.
const Listing = require('../models/Listing');
const defaultEmbedder = require('./embedder');
const { cosine, sourceHash, isFresh } = require('./vector');
const { CANDIDATE_CAP } = require('./candidates');
const { winstonLogger } = require('../middleware/logger');

// Same number the wanted matcher uses, and for the same reason: a first run
// over a large board should not turn into one enormous bill. Anything left
// over is picked up the next time something asks.
const EMBED_BUDGET_PER_RUN = 200;

// Deliberately the wanted board's threshold, read the same way, so there is
// one number to tune and not three. See the long note in
// semantic.matcher.js for how 0.66 was arrived at and why it is per
// provider.
const THRESHOLD = Number(process.env.SEMANTIC_THRESHOLD) || 0.66;

const textOf = (doc) => [doc.title, doc.description];

const createRetriever = (embedder) => {
  /**
   * Vectors for every candidate, embedding the ones that need it in a
   * single batched call. Lifted from semantic.matcher.js, which had it as a
   * closure — three callers now need it, so it lives in one place.
   */
  const vectorsFor = async (candidates) => {
    const model = embedder.describe().model;
    const vectors = new Map();
    const pending = [];

    for (const listing of candidates) {
      const hash = sourceHash(...textOf(listing));
      if (isFresh(listing.embedding, hash, model)) {
        vectors.set(String(listing._id), listing.embedding.vector);
      } else if (pending.length < EMBED_BUDGET_PER_RUN) {
        pending.push({ listing, hash });
      }
    }

    if (pending.length) {
      const fresh = await embedder.embed(
        pending.map(({ listing }) => textOf(listing).join('\n')),
        { kind: 'document' }
      );

      await Promise.all(
        pending.map(({ listing, hash }, i) => {
          vectors.set(String(listing._id), fresh[i]);
          // A failed cache write must not fail the search; it only means we
          // pay to embed this one again next time.
          return Listing.updateOne(
            { _id: listing._id },
            { $set: { embedding: { vector: fresh[i], model, sourceHash: hash, at: new Date() } } }
          ).catch((err) =>
            winstonLogger.warn(`Could not cache embedding for listing ${listing._id}: ${err.message}`)
          );
        })
      );
    }

    return vectors;
  };

  /**
   * Listings whose meaning is close to `query`, best first.
   *
   * @param {string} query               free text — a search box, a saved search
   * @param {object} options.filter      which listings are eligible (a Mongo filter)
   * @param {number} options.limit       how many to return
   * @param {number} options.threshold   minimum cosine score
   * @returns {Promise<Array<{ listing, score }>>}  empty when retrieval is unavailable
   */
  const semanticSearch = async (query, { filter = {}, limit = 20, threshold = THRESHOLD } = {}) => {
    const text = (query || '').trim();
    if (!text) return [];

    // No provider is not an error. Every caller has a keyword path that
    // works without one, and returning nothing lets them use it.
    if (!embedder.isAvailable()) {
      embedder.warnUnavailableOnce();
      return [];
    }

    try {
      const candidates = await Listing.find({ status: 'active', ...filter })
        .select('+embedding')
        .sort({ createdAt: -1 })
        .limit(CANDIDATE_CAP)
        .lean();

      if (candidates.length === 0) return [];

      // 'query' rather than 'document': a short search phrase is embedded
      // so that it lands near the longer listings that answer it, rather
      // than near other short phrases. Providers without the distinction
      // ignore it.
      const [queryVector] = await embedder.embed([text], { kind: 'query' });
      const vectors = await vectorsFor(candidates);

      return candidates
        .map((listing) => {
          const vector = vectors.get(String(listing._id));
          if (!vector) return null;
          return {
            listing,
            // Clamped because cosine runs to -1 and callers expect 0..1.
            score: Math.max(0, Math.min(1, cosine(queryVector, vector))),
          };
        })
        .filter((m) => m && m.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (err) {
      // Same rule as the wanted matcher: a provider outage degrades the
      // quality of a search, it does not break the page.
      winstonLogger.error(`Semantic search failed, returning nothing: ${err.message}`);
      return [];
    }
  };

  return { semanticSearch, THRESHOLD };
};

module.exports = createRetriever(defaultEmbedder);
module.exports.createRetriever = createRetriever;
