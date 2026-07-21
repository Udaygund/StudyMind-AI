const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role:    { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    noteId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
    sessionId: { type: String, required: true, unique: true },
    messages:  { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
