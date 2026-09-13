const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true, trim: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index: userId for "my saved searches"
savedSearchSchema.index({ userId: 1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
