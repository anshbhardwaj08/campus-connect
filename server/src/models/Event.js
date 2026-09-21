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
    // Who is coming, not just how many. `rsvpCount` stays as the
    // denormalised length: the admin lists and the old cards read it, and it
    // is kept in step with every push and pull below.
    attendees: [
      {
        _id: false,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    // Optional. No capacity means no limit — most campus events are "turn up".
    capacity: { type: Number, min: 1 },
    rsvpCount: { type: Number, default: 0 },
    imageUrl: { type: String },
    category: { type: String },
  },
  { timestamps: true }
);

// Indexes: date for upcoming-events sort, organizerId for "my events"
eventSchema.index({ date: 1 });
eventSchema.index({ organizerId: 1 });
eventSchema.index({ 'attendees.userId': 1 });

module.exports = mongoose.model('Event', eventSchema);
