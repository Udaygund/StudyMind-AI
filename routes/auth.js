const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.post('/sync', protect, async (req, res) => {
  try {
    const { uid, email, displayName } = req.user;
    const user = await User.findOneAndUpdate(
      { uid },
      { uid, email, displayName: displayName || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({
      message: 'User synced',
      user: {
        uid:         user.uid,
        email:       user.email,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    console.error('Auth sync error:', err);
    return res.status(500).json({ message: 'Failed to sync user' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({
      user: {
        uid:         user.uid,
        email:       user.email,
        displayName: user.displayName,
        photoURL:    user.photoURL,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;
