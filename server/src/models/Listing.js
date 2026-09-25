const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    // Sale or rent. Deliberately not "both": a listing that is either would
    // have to carry two prices and answer "which one is this deal for?" at
    // every step of the handshake. Two clean kinds is the honest scope.
    listingType: { type: String, enum: ['sale', 'rent'], default: 'sale' },
    // For a rental this is the rate per `rentPeriod`, not a total. Reusing
    // `price` keeps sorting, filters and the deal's finalPrice on one field.
    price: { type: Number, required: true, min: 0 },
    rentPeriod: { type: String, enum: ['day', 'week', 'month'] },
    // Held by the owner and returned with the item. Zero means none asked.
    securityDeposit: { type: Number, min: 0, default: 0 },
    isNegotiable: { type: Boolean, default: false },
    isFree: { type: Boolean, default: false },
    category: { type: String, required: true },
    subCategory: { type: String },
    condition: { type: String, enum: ['new', 'like-new', 'used', 'for-parts'], required: true },
    images: [{ type: String }],
    pickupLocation: { type: String },
    // 'rented' is the rental counterpart of 'sold', but unlike sold it is
    // meant to be reversed: the item comes back and the owner relists it.
    status: {
      type: String,
      enum: ['pending', 'active', 'sold', 'rented', 'expired', 'rejected'],
      default: 'pending',
    },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewCount: { type: Number, default: 0 },
    isBumped: { type: Boolean, default: false },
    bumpExpiry: { type: Date },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    rejectionReason: { type: String },
    // Cached vector for the semantic matcher, filled in by the hourly
    // wantedMatch job and never on a request path. `sourceHash` is what the
    // vector was made from, so an edited listing is spotted and re-embedded;
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
    // "Goes with this" — the cross-sell, written by the hourly job and read
    // straight off the document on a page view, so no model is ever on a
    // request path. `source` records whether a generator wrote these or the
    // hand-written map did, which is the difference between the feature
    // being RAG and being a lookup; without it there is no way to tell
    // afterwards which one a given listing got.
    goesWith: {
      type: {
        items: [
          {
            _id: false,
            listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
            reason: String,
          },
        ],
        source: { type: String, enum: ['generated', 'map', 'none'] },
        at: Date,
      },
      select: false,
      default: undefined,
    },
    scamScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes: text search on title/description, common filters, TTL on expiresAt
listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ listingType: 1, status: 1 });
listingSchema.index({ sellerId: 1 });
listingSchema.index({ status: 1, isBumped: -1, createdAt: -1 });
listingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Listing', listingSchema);
