const mongoose = require('mongoose');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const assertObjectId = (id, label = 'id') => {
  if (!id || !mongoose.isValidObjectId(id)) throw new HttpError(400, `Valid ${label} required`);
  return id;
};

const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

module.exports = { HttpError, assertObjectId, clampInt };
