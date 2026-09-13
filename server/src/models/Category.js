const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'select'], default: 'text' },
    options: [{ type: String }],
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    customFields: [customFieldSchema],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes: slug unique (declared above), parentId for tree lookups
categorySchema.index({ parentId: 1 });
categorySchema.index({ order: 1 });

module.exports = mongoose.model('Category', categorySchema);
