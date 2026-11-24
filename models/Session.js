const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role:    { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, default: '' },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    noteId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    title:     { type: String, default: 'New chat' },
    messages:  { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
