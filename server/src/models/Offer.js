const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered'],
      default: 'pending',
    },
    counterAmount: { type: Number },
  },
  { timestamps: true }
);

// Indexes: listingId for offer history, conversationId for thread lookup
offerSchema.index({ listingId: 1 });
offerSchema.index({ conversationId: 1 });
offerSchema.index({ buyerId: 1, status: 1 });

module.exports = mongoose.model('Offer', offerSchema);
