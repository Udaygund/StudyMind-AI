require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose  = require('mongoose');
const connectDB = require('./config/db');

// ── Routes ───────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const otpRoutes      = require('./routes/otp');
const notesRoutes    = require('./routes/notes');
const generateRoutes = require('./routes/generate');
const chatRoutes     = require('./routes/chat');
const statsRoutes    = require('./routes/stats');

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('⚠️  OPENROUTER_API_KEY not set — AI features will return 503');
}

connectDB();

const app = express();
app.set('trust proxy', 1); // correct client IPs for rate limiting behind a proxy

// ── Security middleware ──────────────────────────────
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────
const limiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             300,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: 'Too many requests, please try again later' },
});
const aiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             15,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: 'AI rate limit reached — wait a moment and try again' },
});

app.use('/api', limiter);
app.use('/api/generate', (req, res, next) => (req.method === 'POST' && !req.path.startsWith('/mcq/attempt') ? aiLimiter(req, res, next) : next()));
app.use('/api/chat/message', aiLimiter);
app.use('/api/chat/suggest', aiLimiter);

// ── Body parsers ─────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── API Routes ───────────────────────────────────────
app.use('/api/auth/otp', otpRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/notes',    notesRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/chat',     chatRoutes);
app.use('/api/stats',    statsRoutes);

// ── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    db:        ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    ai:        process.env.OPENROUTER_API_KEY ? 'configured' : 'missing key',
    model:     process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-5.5',
  });
});

// ── 404 handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ─────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError')        { status = 400; message = 'Invalid id'; }
  if (err.name === 'ValidationError')  { status = 400; }
  if (err.type === 'entity.too.large') { status = 413; message = 'Request body too large'; }
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON'; }

  if (status >= 500) console.error('Server error:', err);
  if (res.headersSent) return res.end();
  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
  });
});

// ── Start server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 StudyMind backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
