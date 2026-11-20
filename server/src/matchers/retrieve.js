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

// A HIGHER bar than the one above, and not a matter of taste. 0.66 scores a
// short query ("cycle") against a whole listing; this scores two whole
// listings against each other, and two documents of similar length and
// register sit closer together than a three-word phrase sits to either.
//
// Measured, not guessed — `scripts/similar-run.js` does this on a real
// board, and an 18-listing hand-built one gave, on
// `gemini-embedding-001` (768 dims):
//
//   same kind (two bicycles, two calculators)   0.822 - 0.923
//   same category, different thing              up to 0.858
//   different category                          up to 0.823
//
// So the bands OVERLAP and no threshold separates them cleanly. That is
// worth understanding rather than tuning around: the pairs that break it
// are COMPLEMENTS — a phone and its own back cover score 0.858, a
// calculator and a maths textbook 0.823 — because a thing and its
// companion get described in the same words. Meaning cannot tell "instead
// of this" from "along with this".
//
// Hence 0.80 and not higher: it clears every same-kind pair with room to
// spare (the worst was 0.822, and the bicycles are the hard case this
// feature exists for), and the complements that sneak past it are dropped
// by the caller instead, which knows what the cross-sell already picked.
// Raising it to 0.84 to shut them out took the bicycles with it.
const SIMILAR_THRESHOLD = Number(process.env.SIMILAR_THRESHOLD) || 0.8;

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

  /**
   * Listings that are the same KIND of thing as `anchor`, closest first.
   *
   * The opposite question to the cross-sell: that one wants complements
   * (a phone -> its case), this one wants substitutes (a phone -> other
   * phones). Nearest-by-embedding is the wrong tool there and the right
   * one here.
   *
   * **Nothing here touches the network.** It compares cached vectors and
   * nothing else: no embedding call, no cache write, no provider check.
   * That is what makes it safe on a listing page, which is an ordinary
   * page load rather than something the student asked for — the rule
   * browse search obeys with its `deep` gate. A listing whose vector the
   * hourly job has not written yet simply has no row, and the caller falls
   * back to something cheap.
   *
   * `anchor` must have been read with `+embedding`, since both models hide
   * it by default.
   *
   * @param {object} anchor              a Listing document, embedding selected
   * @param {object} options.filter      which listings are eligible (a Mongo filter)
   * @param {number} options.limit       how many to return
   * @param {number} options.threshold   minimum cosine score
   * @returns {Promise<Array<{ listing, score }>>}  empty when there is no usable vector
   */
  const similarTo = async (anchor, { filter = {}, limit = 6, threshold = SIMILAR_THRESHOLD } = {}) => {
    const model = embedder.describe().model;
    if (!anchor || !isFresh(anchor.embedding, sourceHash(...textOf(anchor)), model)) return [];

    // Not wrapped in a try/catch, unlike semanticSearch. There is no
    // provider to fall over here, so the only thing that can fail is the
    // database — and the caller's fallback needs the database too, so
    // swallowing it would turn a dead page into a confusingly empty one.
    const candidates = await Listing.find({ status: 'active', _id: { $ne: anchor._id }, ...filter })
      .select('+embedding')
      .sort({ createdAt: -1 })
      .limit(CANDIDATE_CAP)
      .lean();

    return candidates
      .map((listing) => {
        // Cached or nothing. A stale vector is skipped rather than
        // refreshed: refreshing is the hourly job's business.
        if (!isFresh(listing.embedding, sourceHash(...textOf(listing)), model)) return null;
        return {
          listing,
          score: Math.max(0, Math.min(1, cosine(anchor.embedding.vector, listing.embedding.vector))),
        };
      })
      .filter((m) => m && m.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };

  return { semanticSearch, similarTo, THRESHOLD, SIMILAR_THRESHOLD };
};

module.exports = createRetriever(defaultEmbedder);
module.exports.createRetriever = createRetriever;
