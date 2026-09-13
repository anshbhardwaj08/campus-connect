const mongoose = require('mongoose');

const carpoolSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    departureDate: { type: Date, required: true },
    seatsAvailable: { type: Number, required: true, min: 0 },
    contactInfo: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

// Indexes: route + date for browsing, userId for "my rides"
carpoolSchema.index({ from: 1, to: 1, departureDate: 1 });
carpoolSchema.index({ userId: 1 });

module.exports = mongoose.model('Carpool', carpoolSchema);
