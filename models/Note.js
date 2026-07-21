const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true, index: true },
    title:   { type: String, required: true },
    source:  { type: String, default: 'text' },
    chunks:  { type: [String], default: [] },
    rawText: { type: String, default: '' },
  },
  { timestamps: true }
);

noteSchema.virtual('chunkCount').get(function () {
  return this.chunks?.length || 0;
});

noteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Note', noteSchema);
