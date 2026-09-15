const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    collegeEmail: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    dept: { type: String, trim: true },
    batch: { type: String, trim: true },
    hostel: { type: String, trim: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['student', 'moderator', 'admin'], default: 'student' },
    trustScore: { type: Number, default: 50 },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    // Shown to the suspended person on the way out. Optional: a moderator
    // dealing with an obvious spammer should not be forced to write an
    // essay, but with nothing recorded nobody can ever be told why.
    banReason: { type: String, trim: true },
    dealsCompleted: { type: Number, default: 0 },
    refreshToken: { type: String, select: false },
    passwordHash: { type: String, required: true, select: false },
    // Password reset. The stored value is a SHA-256 of the token that went
    // out in the email, never the token itself — a leaked database then
    // does not hand anyone a working reset link. Both are cleared the
    // moment a reset succeeds, so a link works exactly once.
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Indexes: collegeEmail unique (declared above), role for admin filtering, trustScore for sorting
userSchema.index({ role: 1 });
userSchema.index({ trustScore: -1 });
// Partial, so it indexes only the handful of suspended accounts rather than
// every row under a low-cardinality boolean. Every student-facing list
// looks this set up to exclude their content — see utils/blockedUsers.js.
userSchema.index({ isBlocked: 1 }, { partialFilterExpression: { isBlocked: true } });

module.exports = mongoose.model('User', userSchema);
