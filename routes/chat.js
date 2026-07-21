const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { protect }    = require('../middleware/auth');
const Note    = require('../models/Note');
const Session = require('../models/Session');
const { retrieveRelevantChunks } = require('../utils/chunker');
const { generateTextStream }     = require('../utils/gemini');

router.post('/session', protect, async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ message: 'noteId required' });

    const note = await Note.findOne({ _id: noteId, userId: req.user.uid });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const session = await Session.create({
      userId:    req.user.uid,
      noteId,
      sessionId: uuidv4(),
      messages:  [],
    });

    return res.status(201).json({
      sessionId: session.sessionId,
      _id:       session._id,
      noteTitle: note.title,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create session' });
  }
});

router.post('/message', protect, async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message?.trim()) {
      return res.status(400).json({ message: 'sessionId and message required' });
    }

    const session = await Session.findOne({ sessionId, userId: req.user.uid });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const note = await Note.findById(session.noteId);
    if (!note)  return res.status(404).json({ message: 'Associated note not found' });

    const context = retrieveRelevantChunks(note.chunks, message, 4);

    const recentMessages = session.messages.slice(-6);
    const historyText = recentMessages
      .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a helpful study assistant. Answer the student's question based ONLY on the provided notes.
If the answer is not in the notes, say so clearly and suggest what to look up.
Be concise, accurate, and educational.

Relevant Notes (retrieved via RAG):
${context}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}
Student: ${message}
Assistant:`;

    session.messages.push({ role: 'user', content: message });
    await session.save();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';

    await generateTextStream(prompt, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    session.messages.push({ role: 'assistant', content: fullResponse });
    await session.save();

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: err.message });
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

router.get('/history/:sessionId', protect, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId:    req.user.uid,
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    return res.status(200).json({ messages: session.messages });
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed' });
  }
});

router.get('/sessions/:noteId', protect, async (req, res) => {
  try {
    const sessions = await Session.find({
      noteId: req.params.noteId,
      userId: req.user.uid,
    })
      .select('sessionId createdAt updatedAt')
      .sort({ updatedAt: -1 });
    return res.status(200).json({ sessions });
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed' });
  }
});

router.delete('/session/:sessionId', protect, async (req, res) => {
  try {
    await Session.findOneAndDelete({ sessionId: req.params.sessionId, userId: req.user.uid });
    return res.status(200).json({ message: 'Session deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed' });
  }
});

module.exports = router;
