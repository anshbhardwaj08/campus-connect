const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    finalPrice: { type: Number, required: true, min: 0 },
    verifyCode: { type: String, required: true },
    meetupLocation: { type: String },
    status: {
      type: String,
      enum: ['pending', 'verified', 'completed', 'disputed'],
      default: 'pending',
    },
    buyerConfirmed: { type: Boolean, default: false },
    sellerConfirmed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes: buyer/seller lookups for "my deals"
dealSchema.index({ buyerId: 1 });
dealSchema.index({ sellerId: 1 });
dealSchema.index({ listingId: 1 });
dealSchema.index({ status: 1 });

module.exports = mongoose.model('Deal', dealSchema);
