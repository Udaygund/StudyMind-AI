const mongoose = require('mongoose');

// One pending login code per email. Codes are stored hashed and expire
// automatically via the TTL index on `expiresAt`.
const otpCodeSchema = new mongoose.Schema(
  {
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    codeHash:  { type: String, required: true },
    attempts:  { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    lastSentAt:{ type: Date, required: true },
  },
  { timestamps: true }
);

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpCode', otpCodeSchema);
