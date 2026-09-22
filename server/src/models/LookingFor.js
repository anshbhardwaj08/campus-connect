const mongoose = require('mongoose');

const lookingForSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: String },
    maxBudget: { type: Number, min: 0 },
    status: { type: String, enum: ['open', 'fulfilled'], default: 'open' },
    // How far the matcher has already told this student about. Unset means
    // it has never run for this post, which the service treats as "consider
    // the whole board" rather than "consider nothing" — see
    // services/wantedMatch.service.js.
    lastNotifiedAt: { type: Date },
    // Cached vector for the semantic matcher, filled in by the hourly
    // wantedMatch job and never on a request path. `sourceHash` is what the
    // vector was made from, so an edited request is spotted and re-embedded;
    // `model` so that changing the embedding model invalidates every vector
    // rather than silently comparing two incompatible spaces.
    //
    // select: false — it is a few hundred numbers nobody browsing wants, and
    // without this every listing response would carry it.
    embedding: {
      type: {
        vector: { type: [Number], default: undefined },
        model: String,
        sourceHash: String,
        at: Date,
      },
      select: false,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Indexes: userId for "my requests", status+category for matching listings
lookingForSchema.index({ userId: 1 });
lookingForSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model('LookingFor', lookingForSchema);
