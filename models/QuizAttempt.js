const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    userId:     { type: String, required: true, index: true },
    noteId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true, index: true },
    score:      { type: Number, required: true, min: 0 },
    total:      { type: Number, required: true, min: 1 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    durationSec:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
