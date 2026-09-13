const mongoose = require('mongoose');

const lookingForSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: String },
    maxBudget: { type: Number, min: 0 },
    status: { type: String, enum: ['open', 'fulfilled'], default: 'open' },
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
