const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const toJSON = (user) => ({
  uid:         user.uid,
  email:       user.email,
  displayName: user.displayName,
  photoURL:    user.photoURL,
});

router.post('/sync', protect, async (req, res, next) => {
  try {
    const { uid, email, displayName, photoURL } = req.user;
    const user = await User.findOneAndUpdate(
      { uid },
      { $set: { email, displayName, photoURL } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: 'User synced', user: toJSON(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: toJSON(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
