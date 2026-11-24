const express  = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { protect }    = require('../middleware/auth');
const Note    = require('../models/Note');
const Session = require('../models/Session');
const { retrieveRelevantChunks } = require('../utils/chunker');
const { generateTextStream, generateJSONArray } = require('../utils/llm');
const { openSSE, sendSSE, endSSE, failSSE } = require('../utils/sse');
const { HttpError, assertObjectId } = require('../utils/validate');
const { recordActivity } = require('../utils/activity');

const router = express.Router();
const MAX_MESSAGE_LEN = 4000;

const SYSTEM_PROMPT = `You are StudyMind, a friendly and precise study tutor.
Answer the student's question using ONLY the provided notes. If the notes don't cover it, say so clearly
and suggest what to look up. Be concise and educational. Use Markdown (bold key terms, bullet lists,
short code blocks when relevant).`;

router.post('/session', protect, async (req, res, next) => {
  try {
    const { noteId } = req.body;
    assertObjectId(noteId, 'noteId');
    const note = await Note.findOne({ _id: noteId, userId: req.user.uid }).select('title');
    if (!note) throw new HttpError(404, 'Note not found');

    const session = await Session.create({
      userId:    req.user.uid,
      noteId,
      sessionId: uuidv4(),
      messages:  [],
    });

    return res.status(201).json({
      sessionId: session.sessionId,
      _id:       session._id,
      title:     session.title,
      noteTitle: note.title,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/message', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const message = String(req.body.message || '').trim().slice(0, MAX_MESSAGE_LEN);
    if (!sessionId || !message) throw new HttpError(400, 'sessionId and message required');

    const session = await Session.findOne({ sessionId, userId: req.user.uid });
    if (!session) throw new HttpError(404, 'Session not found');

    const note = await Note.findOne({ _id: session.noteId, userId: req.user.uid });
    if (!note) throw new HttpError(404, 'Associated note not found');

    // Include the previous question in the retrieval query so follow-ups
    // like "explain that more" still find the right chunks.
    const lastUser = [...session.messages].reverse().find(m => m.role === 'user');
    const context  = retrieveRelevantChunks(note.chunks, `${message} ${lastUser?.content || ''}`, 5);

    const history = session.messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nNotes titled "${note.title}" (retrieved excerpts):\n${context}` },
      ...history,
      { role: 'user', content: message },
    ];

    if (!session.messages.length) {
      session.title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
    }
    session.messages.push({ role: 'user', content: message });
    await session.save();

    const controller = openSSE(req, res);
    let full = '';
    try {
      full = await generateTextStream(messages, (text) => sendSSE(res, { text }), { signal: controller.signal });
    } finally {
      // Persist whatever we got — even a partial answer if the user hit Stop.
      if (full.trim()) {
        session.messages.push({ role: 'assistant', content: full });
        await session.save().catch(e => console.error('Session save failed:', e.message));
      }
    }
    recordActivity(req.user.uid);
    endSSE(res);
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Chat error:', err.message);
    failSSE(res, err);
  }
});

router.post('/suggest', protect, async (req, res, next) => {
  try {
    const { noteId } = req.body;
    assertObjectId(noteId, 'noteId');
    const note = await Note.findOne({ _id: noteId, userId: req.user.uid }).select('title chunks');
    if (!note) throw new HttpError(404, 'Note not found');

    const prompt = `Suggest 4 short, interesting questions (max 12 words each) a student might ask about these notes.
Return JSON: {"questions": [string, string, string, string]}

Notes:
${retrieveRelevantChunks(note.chunks, '', 6)}`;
    const questions = (await generateJSONArray(prompt, { maxTokens: 400 }))
      .filter(q => typeof q === 'string' && q.trim())
      .slice(0, 4);
    return res.status(200).json({ questions });
  } catch (err) {
    next(err);
  }
});

router.get('/history/:sessionId', protect, async (req, res, next) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId, userId: req.user.uid });
    if (!session) throw new HttpError(404, 'Session not found');
    return res.status(200).json({ messages: session.messages, title: session.title });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions/:noteId', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.noteId, 'noteId');
    const sessions = await Session.aggregate([
      { $match: { noteId: new mongoose.Types.ObjectId(req.params.noteId), userId: req.user.uid } },
      { $sort: { updatedAt: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, sessionId: 1, title: 1, createdAt: 1, updatedAt: 1, messageCount: { $size: '$messages' } } },
    ]);
    return res.status(200).json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.delete('/session/:sessionId', protect, async (req, res, next) => {
  try {
    const deleted = await Session.findOneAndDelete({ sessionId: req.params.sessionId, userId: req.user.uid });
    if (!deleted) throw new HttpError(404, 'Session not found');
    return res.status(200).json({ message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
