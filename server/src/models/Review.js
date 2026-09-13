const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true },
    type: { type: String, enum: ['buyer', 'seller'], required: true },
  },
  { timestamps: true }
);

// Indexes: revieweeId for profile review listing, unique per deal+reviewer to prevent duplicates
reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ dealId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
