const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    finalPrice: { type: Number, required: true, min: 0 },
    verifyCode: { type: String, required: true },
    meetupLocation: { type: String },
    status: {
      type: String,
      enum: ['pending', 'verified', 'completed', 'disputed'],
      default: 'pending',
    },
    buyerConfirmed: { type: Boolean, default: false },
    sellerConfirmed: { type: Boolean, default: false },

    // --- Rentals only -----------------------------------------------------
    // How long the hire was agreed for, settled when the owner accepts.
    rentalDays: { type: Number, min: 1 },
    // Copied from the listing at accept, not read back from it later: the
    // owner can edit the listing mid-hire, and what matters afterwards is
    // the figure the two of them agreed. Same reason finalPrice is stored
    // here rather than looked up.
    //
    // The platform never holds this. It is cash between two students, like
    // the price — recording it is so the deal can remind them both, not a
    // claim that anything is in escrow.
    securityDeposit: { type: Number, min: 0, default: 0 },
    // When it is due back. Set at handover, not at agreement: the clock a
    // renter has in mind starts when the thing is actually in their hands,
    // and the meetup can be days after the deal was struck.
    dueAt: { type: Date },
    returnedAt: { type: Date },
    // Stamped so the daily job nudges once per milestone rather than every
    // morning forever. An ignored reminder repeated daily gets muted, and
    // then the one that matters is muted too.
    dueSoonNotifiedAt: { type: Date },
    overdueNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes: buyer/seller lookups for "my deals"
dealSchema.index({ buyerId: 1 });
dealSchema.index({ sellerId: 1 });
dealSchema.index({ listingId: 1 });
dealSchema.index({ status: 1 });
// The daily reminder job's only query: hires that are out and not yet back.
dealSchema.index({ dueAt: 1, returnedAt: 1 });

module.exports = mongoose.model('Deal', dealSchema);
