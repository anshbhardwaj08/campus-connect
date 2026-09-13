const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    dealStatus: {
      type: String,
      enum: ['chatting', 'offered', 'agreed', 'completed'],
      default: 'chatting',
    },
  },
  { timestamps: true }
);

// Indexes: participants for inbox lookup, listingId for per-listing threads
conversationSchema.index({ participants: 1 });
conversationSchema.index({ listingId: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
