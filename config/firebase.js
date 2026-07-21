const admin = require('firebase-admin');

let initialized = false;

const initFirebase = () => {
  if (initialized) return admin;
  if (admin.apps.length) {
    initialized = true;
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials missing — auth routes will fail');
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialized = true;
  return admin;
};

module.exports = { initFirebase, admin };
