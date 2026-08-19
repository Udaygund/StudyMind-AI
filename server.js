require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');

// ── Routes ───────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const notesRoutes    = require('./routes/notes');
const generateRoutes = require('./routes/generate');
const chatRoutes     = require('./routes/chat');

// ── Connect DB ───────────────────────────────────────
connectDB();

const app = express();

// ── Security middleware ──────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  message:  { message: 'Too many requests, please try again later' },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max:      10,
  message:  { message: 'AI rate limit — wait a moment' },
});

app.use(limiter);
app.use('/api/generate', aiLimiter);
app.use('/api/chat/message', aiLimiter);

// ── Body parsers ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── API Routes ───────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/notes',    notesRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/chat',     chatRoutes);

// ── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

// ── 404 handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 StudyMind backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
