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
    dealsCompleted: { type: Number, default: 0 },
    refreshToken: { type: String, select: false },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// Indexes: collegeEmail unique (declared above), role for admin filtering, trustScore for sorting
userSchema.index({ role: 1 });
userSchema.index({ trustScore: -1 });

module.exports = mongoose.model('User', userSchema);
