const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['listing', 'user', 'message'], required: true },
    reason: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    adminNote: { type: String },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes: status for moderation queue, targetType+targetId for lookup
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
