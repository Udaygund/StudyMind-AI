const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { protect } = require('../middleware/auth');
const Note = require('../models/Note');
const { chunkText } = require('../utils/chunker');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const indexNote = async (userId, title, text, source) => {
  const chunks = chunkText(text);
  return Note.create({
    userId,
    title: title || 'Untitled note',
    source,
    rawText: text,
    chunks,
  });
};

router.get('/', protect, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.uid })
      .sort({ updatedAt: -1 })
      .select('title source chunks createdAt updatedAt');
    const formatted = notes.map((n) => ({
      _id:     n._id,
      title:   n.title,
      source:  n.source,
      chunks:  n.chunks.length,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
    return res.status(200).json({ notes: formatted });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list notes' });
  }
});

router.post('/text', protect, async (req, res) => {
  try {
    const { title, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'text is required' });
    const note = await indexNote(req.user.uid, title, text.trim(), 'text');
    return res.status(201).json({
      _id:    note._id,
      title:  note.title,
      source: note.source,
      chunks: note.chunks.length,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to index text' });
  }
});

router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file is required' });

    const { originalname, mimetype, buffer } = req.file;
    let text = '';

    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
    } else if (
      mimetype.startsWith('text/') ||
      originalname.endsWith('.txt') ||
      originalname.endsWith('.md')
    ) {
      text = buffer.toString('utf8');
    } else {
      return res.status(400).json({ message: 'Unsupported file type (PDF, TXT, MD only)' });
    }

    if (!text.trim()) return res.status(400).json({ message: 'No text extracted from file' });

    const title = req.body.title || originalname.replace(/\.[^.]+$/, '');
    const note = await indexNote(req.user.uid, title, text.trim(), 'upload');
    return res.status(201).json({
      _id:    note._id,
      title:  note.title,
      source: note.source,
      chunks: note.chunks.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ message: 'Upload failed' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.uid,
    });
    if (!deleted) return res.status(404).json({ message: 'Note not found' });
    return res.status(200).json({ message: 'Note deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed' });
  }
});

module.exports = router;
