const express   = require('express');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');
const OtpCode   = require('../models/OtpCode');
const { initFirebase } = require('../config/firebase');
const { smtpConfigured, sendLoginCode } = require('../utils/mailer');
const { HttpError } = require('../utils/validate');

const router = express.Router();

const CODE_TTL_MS   = 10 * 60 * 1000;
const RESEND_MS     = 45 * 1000;
const MAX_ATTEMPTS  = 5;
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Codes are HMAC'd so a database leak doesn't reveal them.
const SECRET = process.env.OTP_SECRET || crypto.randomBytes(32).toString('hex');

const hash = (email, code) => crypto.createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
const normEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 254);

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many code requests — try again in a few minutes' },
});
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 25, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts — try again in a few minutes' },
});

router.post('/request', requestLimiter, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');

    const devMode = !smtpConfigured() && process.env.NODE_ENV !== 'production';
    if (!smtpConfigured() && !devMode) throw new HttpError(503, 'Email sign-in is not configured');

    const existing = await OtpCode.findOne({ email });
    if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_MS) {
      const wait = Math.ceil((RESEND_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000);
      throw new HttpError(429, `Please wait ${wait}s before requesting another code`);
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await OtpCode.findOneAndUpdate(
      { email },
      { email, codeHash: hash(email, code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MS), lastSentAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (devMode) {
      console.log(`\n✉️  [dev] Sign-in code for ${email}: ${code}  (SMTP not configured — not emailed)\n`);
    } else {
      try {
        await sendLoginCode(email, code);
      } catch (err) {
        console.error('Mail send failed:', err.message);
        await OtpCode.deleteOne({ email });
        throw new HttpError(502, 'Could not send the email — try again shortly');
      }
    }

    return res.status(200).json({
      message: 'Code sent',
      resendIn: RESEND_MS / 1000,
      ...(devMode && { devNote: 'Email isn’t configured yet — the code is printed in the server console.' }),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify', verifyLimiter, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    const code  = String(req.body.code || '').replace(/\D/g, '');
    if (!EMAIL_RE.test(email) || code.length !== 6) throw new HttpError(400, 'Enter the 6-digit code');

    const record = await OtpCode.findOne({ email });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, 'That code has expired or was already used — request a new one');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await OtpCode.deleteOne({ email });
      throw new HttpError(429, 'Too many wrong attempts — request a new code');
    }

    const ok = crypto.timingSafeEqual(Buffer.from(record.codeHash, 'hex'), Buffer.from(hash(email, code), 'hex'));
    if (!ok) {
      record.attempts += 1;
      await record.save();
      const left = MAX_ATTEMPTS - record.attempts;
      throw new HttpError(400, left > 0 ? `Incorrect code — ${left} attempt${left === 1 ? '' : 's'} left` : 'Too many wrong attempts — request a new code');
    }
    await OtpCode.deleteOne({ email });

    const firebase = initFirebase();
    if (!firebase) throw new HttpError(503, 'Auth service not configured');

    // Same email = same account, whether they signed up with Google or a code.
    let user;
    try {
      user = await firebase.auth().getUserByEmail(email);
      if (!user.emailVerified) user = await firebase.auth().updateUser(user.uid, { emailVerified: true });
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      user = await firebase.auth().createUser({ email, emailVerified: true });
    }
    if (user.disabled) throw new HttpError(403, 'This account has been disabled');

    const token = await firebase.auth().createCustomToken(user.uid);
    return res.status(200).json({ token, isNewUser: !user.metadata?.lastSignInTime });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
