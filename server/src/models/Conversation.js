const mongoose = require('mongoose');

// What a conversation is about. Listings were the only thing worth talking
// about when this was written, so `listingId` was required — but a want, a
// ride and a found calculator all need a reply too.
//
// `listingId` stays (optional) so every existing thread, populate and query
// keeps working untouched. Anything that is not a listing sets `subject`
// instead. The title is denormalised on purpose: the inbox would otherwise
// need a different populate per kind just to render one line of text.
const subjectSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['listing', 'lookingfor', 'carpool', 'lostfound'],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, trim: true },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    subject: { type: subjectSchema },
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

// Indexes: participants for inbox lookup, listingId for per-listing threads,
// subject.refId so "is there already a thread about this ride?" is cheap.
conversationSchema.index({ participants: 1 });
conversationSchema.index({ listingId: 1 });
conversationSchema.index({ 'subject.refId': 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
