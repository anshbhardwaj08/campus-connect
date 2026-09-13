const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['lost', 'found'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String },
    images: [{ type: String }],
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes: type+status for browsing, userId for "my posts"
lostFoundSchema.index({ type: 1, status: 1 });
lostFoundSchema.index({ userId: 1 });

module.exports = mongoose.model('LostFound', lostFoundSchema);
