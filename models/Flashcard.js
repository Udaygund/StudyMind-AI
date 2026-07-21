const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer:   { type: String, required: true },
    learned:  { type: Boolean, default: false },
  },
  { _id: false }
);

const flashcardSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
    cards:  { type: [cardSchema], default: [] },
  },
  { timestamps: true }
);

flashcardSchema.index({ userId: 1, noteId: 1 }, { unique: true });

module.exports = mongoose.model('Flashcard', flashcardSchema);
