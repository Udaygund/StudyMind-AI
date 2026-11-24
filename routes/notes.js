const express  = require('express');
const multer   = require('multer');
// Import the library entry directly: pdf-parse's index.js runs a debug
// self-test (reading a missing sample PDF) when `module.parent` is unset.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const { protect } = require('../middleware/auth');
const Note        = require('../models/Note');
const Session     = require('../models/Session');
const Flashcard   = require('../models/Flashcard');
const QuizAttempt = require('../models/QuizAttempt');
const { chunkText } = require('../utils/chunker');
const { HttpError, assertObjectId } = require('../utils/validate');

const router = express.Router();
const MAX_TEXT_CHARS = 2_000_000;
const ALLOWED_EXT = /\.(pdf|txt|md|markdown)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024, files: 1 },
});

const sanitizeTitle = (t, fallback = 'Untitled note') =>
  (String(t || '').trim().replace(/\s+/g, ' ').slice(0, 120)) || fallback;

const summarize = (note) => ({
  _id:       note._id,
  title:     note.title,
  source:    note.source,
  chunks:    note.chunks.length,
  words:     note.rawText ? note.rawText.split(/\s+/).filter(Boolean).length : 0,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

const indexNote = async (userId, title, text, source) => {
  const clean = text.slice(0, MAX_TEXT_CHARS);
  const chunks = chunkText(clean);
  if (!chunks.length) throw new HttpError(400, 'No readable text found');
  return Note.create({ userId, title: sanitizeTitle(title), source, rawText: clean, chunks });
};

router.get('/', protect, async (req, res, next) => {
  try {
    // Aggregate so we return counts without shipping every chunk over the wire.
    const notes = await Note.aggregate([
      { $match: { userId: req.user.uid } },
      { $sort: { updatedAt: -1 } },
      { $project: {
          title: 1, source: 1, createdAt: 1, updatedAt: 1,
          chunks: { $size: '$chunks' },
          chars:  { $strLenCP: '$rawText' },
      } },
    ]);
    return res.status(200).json({
      notes: notes.map(n => ({ ...n, words: Math.round(n.chars / 5.5) })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.id, 'note id');
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!note) throw new HttpError(404, 'Note not found');
    return res.status(200).json({ ...summarize(note), rawText: note.rawText });
  } catch (err) {
    next(err);
  }
});

router.post('/text', protect, async (req, res, next) => {
  try {
    const { title, text } = req.body;
    if (typeof text !== 'string' || !text.trim()) throw new HttpError(400, 'text is required');
    const note = await indexNote(req.user.uid, title || 'Pasted notes', text.trim(), 'text');
    return res.status(201).json(summarize(note));
  } catch (err) {
    next(err);
  }
});

router.post('/upload', protect, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 15 MB)' : err.message;
      return next(new HttpError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, msg));
    }
    if (err) return next(err);
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'file is required');
    const { originalname, mimetype, buffer } = req.file;
    if (!ALLOWED_EXT.test(originalname) && mimetype !== 'application/pdf' && !mimetype.startsWith('text/')) {
      throw new HttpError(400, 'Unsupported file type (PDF, TXT, MD only)');
    }

    let text = '';
    if (mimetype === 'application/pdf' || /\.pdf$/i.test(originalname)) {
      try {
        const parsed = await pdfParse(buffer);
        text = parsed.text || '';
      } catch {
        throw new HttpError(400, 'Could not read this PDF — it may be encrypted or corrupted');
      }
    } else {
      text = buffer.toString('utf8');
    }

    if (!text.trim()) {
      throw new HttpError(400, 'No text extracted — scanned/image-only PDFs are not supported');
    }

    const title = req.body.title || originalname.replace(/\.[^.]+$/, '');
    const note  = await indexNote(req.user.uid, title, text.trim(), 'upload');
    return res.status(201).json(summarize(note));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.id, 'note id');
    const title = sanitizeTitle(req.body.title, '');
    if (!title) throw new HttpError(400, 'title is required');
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      { title },
      { new: true }
    );
    if (!note) throw new HttpError(404, 'Note not found');
    return res.status(200).json(summarize(note));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.id, 'note id');
    const filter  = { _id: req.params.id, userId: req.user.uid };
    const deleted = await Note.findOneAndDelete(filter);
    if (!deleted) throw new HttpError(404, 'Note not found');

    // Cascade: remove everything that belonged to this note.
    const related = { noteId: deleted._id, userId: req.user.uid };
    await Promise.all([
      Session.deleteMany(related),
      Flashcard.deleteMany(related),
      QuizAttempt.deleteMany(related),
    ]);
    return res.status(200).json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
