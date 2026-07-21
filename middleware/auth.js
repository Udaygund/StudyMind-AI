const { initFirebase } = require('../config/firebase');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized — no token' });
    }

    const token = header.split(' ')[1];
    const firebase = initFirebase();
    if (!firebase) {
      return res.status(503).json({ message: 'Auth service not configured' });
    }

    const decoded = await firebase.auth().verifyIdToken(token);
    req.user = {
      uid:         decoded.uid,
      email:       decoded.email,
      displayName: decoded.name || decoded.displayName,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

module.exports = { protect };
