const mongoose = require('mongoose');

const lookingForSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: String },
    // Buying or renting. Without this the board could only ask one of the
    // two questions, and a live post reading "cycle, ₹100, for one hour"
    // was scored against ₹4,200 sale prices and matched nothing — correctly
    // by the rules and uselessly in fact. No matcher can fix that; the two
    // intents are different questions about different listings.
    //
    // Defaulted rather than required, because the overwhelming majority of
    // wants are "I want to buy one" and because posts written before this
    // field existed have to mean something. `scripts/backfill-wanted-type.js`
    // re-reads the old ones for rental wording.
    listingType: { type: String, enum: ['sale', 'rent'], default: 'sale' },
    // Only meaningful on a rental want, and it is what makes `maxBudget`
    // interpretable: ₹150 means nothing until you know whether it is per day
    // or per month. Optional even so — a want may not have thought about it,
    // and matchers/candidates.js drops the price filter rather than guess.
    rentPeriod: { type: String, enum: ['day', 'week', 'month'] },
    maxBudget: { type: Number, min: 0 },
    // A reference photo: "a cycle like this one", "this edition of the
    // textbook". Capped at three on the route — a want is one photograph of
    // the kind of thing, not a gallery of an item somebody owns.
    images: { type: [String], default: [] },
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
