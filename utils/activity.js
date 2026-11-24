const User = require('../models/User');

const today = () => new Date().toISOString().slice(0, 10);

/** Record that the user studied today (fire-and-forget). */
const recordActivity = (uid) =>
  User.updateOne({ uid }, { $addToSet: { activityDays: today() } }).catch(() => {});

/** Consecutive-day streak ending today (or yesterday, so it doesn't reset at midnight). */
const computeStreak = (days = []) => {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
  let streak = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
};

module.exports = { recordActivity, computeStreak, today };
