const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    imageUrl: { type: String },
    offerAmount: { type: Number },
    type: { type: String, enum: ['text', 'offer', 'image'], default: 'text' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes: conversationId + createdAt for paginated message history
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
