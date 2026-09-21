const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    imageUrl: { type: String },
    offerAmount: { type: Number },
    // A claim on the community post this thread is about: "I have your
    // wallet", "I want a seat". The owner confirms it from the thread and
    // the post closes itself — see utils/communityClaim.js.
    claim: {
      type: new mongoose.Schema(
        {
          kind: { type: String, enum: ['lostfound', 'lookingfor', 'carpool'], required: true },
          seats: { type: Number, min: 1 },
          status: { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
          decidedAt: { type: Date },
        },
        { _id: false }
      ),
    },
    type: { type: String, enum: ['text', 'offer', 'image', 'claim'], default: 'text' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes: conversationId + createdAt for paginated message history
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
