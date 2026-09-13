const mongoose = require('mongoose');

const savedItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  },
  { timestamps: true }
);

// Compound unique index: a user can save a given listing only once
savedItemSchema.index({ userId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('SavedItem', savedItemSchema);
