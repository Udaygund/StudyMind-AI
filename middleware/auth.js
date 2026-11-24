const { initFirebase } = require('../config/firebase');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized — no token' });
  }

  const firebase = initFirebase();
  if (!firebase) {
    return res.status(503).json({ message: 'Auth service not configured' });
  }

  try {
    const decoded = await firebase.auth().verifyIdToken(header.slice(7).trim());
    req.user = {
      uid:         decoded.uid,
      email:       decoded.email || '',
      displayName: decoded.name || '',
      photoURL:    decoded.picture || '',
    };
  } catch (err) {
    const expired = err?.code === 'auth/id-token-expired';
    return res.status(401).json({ message: expired ? 'Session expired — please sign in again' : 'Not authorized — invalid token' });
  }
  return next();
};

module.exports = { protect };
