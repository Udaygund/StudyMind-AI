const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid:          { type: String, required: true, unique: true },
    email:        { type: String, default: '' },
    displayName:  { type: String, default: '' },
    photoURL:     { type: String, default: '' },
    // Days (YYYY-MM-DD, UTC) on which the user studied — powers the streak.
    activityDays: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
