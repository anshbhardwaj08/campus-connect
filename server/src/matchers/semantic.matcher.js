// Matching by meaning: the second implementation behind the seam in
// ./index.js.
//
// What this buys over the keyword matcher is the case a word list can never
// reach — "something to study on" finding a desk, "keep my food cold"
// finding a mini fridge. Nobody has to have thought of the phrasing in
// advance. What it costs is an external dependency, so everything below is
// arranged around one rule: **a wanted post is never worse off for having
// asked the semantic matcher.** If there is no provider, or the provider is
// down, or it answers with nonsense, this hands the question to the keyword
// matcher rather than returning nothing.
//
// Embedding happens here, lazily, inside the hourly job — never when a
// student posts a listing. Vectors are cached on the documents and reused,
// so the steady-state cost of a run is one embedding call for whatever was
// posted in the last hour, not one per listing per hour.

const Listing = require('../models/Listing');
const LookingFor = require('../models/LookingFor');
const { winstonLogger } = require('../middleware/logger');
const { conceptsOf } = require('./vocabulary');
const { candidateQuery, CANDIDATE_CAP } = require('./candidates');
const { cosine, sourceHash, isFresh } = require('./vector');
const keyword = require('./keyword.matcher');
const defaultEmbedder = require('./embedder');

// Calibrated, not guessed — but calibrated on a small board, so read the
// numbers before trusting it elsewhere.
//
// It shipped at 0.45 on the reasoning that unrelated text scores 0.1-0.3.
// That is true of some embedding spaces and flatly wrong here:
// gemini-embedding-001 with the retrieval task types puts EVERYTHING in a
// narrow band, and the first real run had the control post ("dbjs", which
// means nothing) matching five listings at 0.57-0.59.
//
// Measured against the seeded board on 2026-09-22 (server/scripts/
// seed-demo-listings.js, seven listings with known right answers):
//
//   right answers      0.67 - 0.74
//   wrong answers      0.53 - 0.69
//   pure junk ("dbjs") 0.59 at best
//
// 0.66 keeps all six right answers, drops the junk entirely, and lets
// through one arguable wrong one (a poster, for "something to study on in
// my room" — it is at least a thing for a room). 0.70 would lose the room
// heater at 0.67, which is a worse trade: a missed match is invisible, a
// wrong one teaches people to ignore the alerts.
//
// This number is PER PROVIDER. OpenAI's single space spreads scores much
// wider and will want a lower one. Re-run `npm run match:compare` after any
// change of provider or model, and set SEMANTIC_THRESHOLD rather than
// editing this.
const THRESHOLD = Number(process.env.SEMANTIC_THRESHOLD) || 0.66;

// A ceiling on how much a single run will embed, so a first run over a large
// board cannot turn into one enormous bill. Anything left over is picked up
// by the next run an hour later; nothing is lost, it just arrives late.
const EMBED_BUDGET_PER_RUN = 200;

const textOf = (doc) => [doc.title, doc.description];

const createSemanticMatcher = (embedder) => {
  /**
   * Returns the document's vector, embedding and caching it if what is
   * stored is missing, stale, or from a different model.
   */
  const embeddingFor = async (Model, doc, kind) => {
    const texts = textOf(doc);
    const hash = sourceHash(...texts);

    if (isFresh(doc.embedding, hash, embedder.describe().model)) return doc.embedding.vector;

    const [vector] = await embedder.embed([texts.join('\n')], { kind });
    const embedding = { vector, model: embedder.describe().model, sourceHash: hash, at: new Date() };

    // Fire-and-remember: a failed cache write must not fail the match, it
    // just means we pay to embed this one again next hour.
    await Model.updateOne({ _id: doc._id }, { $set: { embedding } }).catch((err) =>
      winstonLogger.warn(`Could not cache embedding for ${Model.modelName} ${doc._id}: ${err.message}`)
    );

    return vector;
  };

  /**
   * Vectors for every candidate, embedding the ones that need it in one
   * batched call rather than one call each.
   */
  const embeddingsForCandidates = async (candidates) => {
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

  const findMatches = async (wanted, { since = null, limit = 5 } = {}) => {
    if (!embedder.isAvailable()) {
      embedder.warnUnavailableOnce();
      return keyword.findMatches(wanted, { since, limit });
    }

    try {
      // `+embedding` because the field is select:false on the model — without
      // it every candidate would look unembedded and be re-embedded forever.
      const candidates = await Listing.find(candidateQuery(wanted, since))
        .select('+embedding')
        .sort({ createdAt: -1 })
        .limit(CANDIDATE_CAP)
        .lean();

      if (candidates.length === 0) return [];

      // A question and the thing that answers it are embedded differently
      // where the provider supports it — a short request lands nearer the
      // longer listings that answer it, rather than nearer other short
      // requests. Providers without the distinction ignore this.
      const askedVector = await embeddingFor(LookingFor, wanted, 'query');
      const vectors = await embeddingsForCandidates(candidates);

      // Kept for the notification and for comparing the two matchers: which
      // words they happen to agree on. Semantic matching does not need it,
      // but "matched on: cycle" is a great deal easier to trust in a log
      // than "matched at 0.61".
      const asked = conceptsOf(...textOf(wanted));

      return candidates
        .map((listing) => {
          const vector = vectors.get(String(listing._id));
          if (!vector) return null;

          const offered = conceptsOf(...textOf(listing));
          return {
            listing,
            // Clamped because cosine runs to -1 and the seam promises 0..1.
            // Note these scores are NOT comparable with the keyword
            // matcher's — same range, different meaning.
            score: Math.max(0, Math.min(1, cosine(askedVector, vector))),
            shared: [...asked].filter((concept) => offered.has(concept)),
          };
        })
        .filter((m) => m && m.score >= THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (err) {
      // The rule at the top of the file. A provider outage degrades the
      // quality of the matching; it does not stop a student being told.
      winstonLogger.error(`Semantic matcher failed, falling back to keyword: ${err.message}`);
      return keyword.findMatches(wanted, { since, limit });
    }
  };

  return { name: 'semantic', findMatches, THRESHOLD };
};

module.exports = createSemanticMatcher(defaultEmbedder);
module.exports.createSemanticMatcher = createSemanticMatcher;
