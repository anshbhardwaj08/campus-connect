const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    isNegotiable: { type: Boolean, default: false },
    isFree: { type: Boolean, default: false },
    category: { type: String, required: true },
    subCategory: { type: String },
    condition: { type: String, enum: ['new', 'like-new', 'used', 'for-parts'], required: true },
    images: [{ type: String }],
    pickupLocation: { type: String },
    status: {
      type: String,
      enum: ['pending', 'active', 'sold', 'expired', 'rejected'],
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
listingSchema.index({ sellerId: 1 });
listingSchema.index({ status: 1, isBumped: -1, createdAt: -1 });
listingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Listing', listingSchema);
