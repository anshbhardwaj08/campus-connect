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
