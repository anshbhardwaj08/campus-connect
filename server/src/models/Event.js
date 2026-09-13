const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    location: { type: String },
    isFree: { type: Boolean, default: true },
    ticketPrice: { type: Number, default: 0 },
    rsvpCount: { type: Number, default: 0 },
    imageUrl: { type: String },
    category: { type: String },
  },
  { timestamps: true }
);

// Indexes: date for upcoming-events sort, organizerId for "my events"
eventSchema.index({ date: 1 });
eventSchema.index({ organizerId: 1 });

module.exports = mongoose.model('Event', eventSchema);
