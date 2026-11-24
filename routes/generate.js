const express   = require('express');
const { protect } = require('../middleware/auth');
const Note        = require('../models/Note');
const Flashcard   = require('../models/Flashcard');
const QuizAttempt = require('../models/QuizAttempt');
const { sampleChunks } = require('../utils/chunker');
const { generateTextStream, generateJSONArray } = require('../utils/llm');
const { openSSE, sendSSE, endSSE, failSSE } = require('../utils/sse');
const { HttpError, assertObjectId, clampInt } = require('../utils/validate');
const { recordActivity } = require('../utils/activity');

const router = express.Router();

const getNote = async (noteId, userId) => {
  assertObjectId(noteId, 'noteId');
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) throw new HttpError(404, 'Note not found');
  if (!note.chunks?.length) throw new HttpError(400, 'This note has no indexed text');
  return note;
};

const DIFFICULTY = {
  easy:   'Keep questions straightforward — recall of definitions and key facts.',
  medium: 'Mix recall with understanding — ask why and how, not only what.',
  hard:   'Make questions demanding — application, comparison, edge cases and multi-step reasoning.',
};
const pickDifficulty = (d) => (DIFFICULTY[d] ? d : 'medium');

// ── Streaming text modes ─────────────────────────────────────────────────────
const MODES = {
  summary: {
    chunks: 10,
    prompt: (ctx) => `You are an expert study assistant. Write a clear, well-structured summary of these notes in Markdown.
Use these sections with "##" headings:
## Overview
## Key Points  (bulleted)
## Important Definitions  (bold the term, then the definition)
## Takeaways

Notes:
${ctx}`,
  },
  concepts: {
    chunks: 10,
    prompt: (ctx) => `You are a study assistant. Identify the 4-6 most important concepts in these notes and explain each in Markdown.
For each concept use a "### Concept name" heading, then:
- **Explanation:** 2-4 sentences
- **Example:** a simple real-world example
- **Why it matters:** one sentence

Notes:
${ctx}`,
  },
  eli5: {
    chunks: 8,
    prompt: (ctx) => `Explain the main ideas of these notes as if to a curious 10-year-old. Use simple words, short paragraphs,
friendly analogies and Markdown formatting. End with a "## In one sentence" section.

Notes:
${ctx}`,
  },
  studyplan: {
    chunks: 10,
    prompt: (ctx) => `Create a practical 5-day study plan in Markdown for mastering these notes.
For each day use a "### Day N — <focus>" heading with: goals, what to review, an active-recall exercise,
and an estimated time. Finish with a "## Exam-day checklist".

Notes:
${ctx}`,
  },
  mindmap: {
    chunks: 10,
    prompt: (ctx) => `Build a hierarchical outline (mind map) of these notes in Markdown.
Use a single "#" root topic, then nested bullet lists (max 4 levels deep). Keep each node under 8 words.
Output only the outline.

Notes:
${ctx}`,
  },
  mnemonics: {
    chunks: 8,
    prompt: (ctx) => `Create memorable mnemonics, acronyms and memory hooks for the hardest-to-remember facts in these notes.
Use Markdown: a "### <fact>" heading for each, then the mnemonic in bold and a one-line explanation. Give 4-6 items.

Notes:
${ctx}`,
  },
};

const streamMode = (fixedMode) => async (req, res) => {
  try {
    const mode = MODES[fixedMode || req.params.mode];
    if (!mode) throw new HttpError(400, 'Unknown generation mode');
    const note = await getNote(req.body.noteId, req.user.uid);
    const prompt = mode.prompt(sampleChunks(note.chunks, mode.chunks));

    const controller = openSSE(req, res);
    await generateTextStream(prompt, (text) => sendSSE(res, { text }), { signal: controller.signal });
    recordActivity(req.user.uid);
    endSSE(res);
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Stream generate error:', err.message);
    failSSE(res, err);
  }
};

router.post('/stream/:mode', protect, streamMode());
// Backwards-compatible aliases for the original endpoints.
router.post('/summary',  protect, streamMode('summary'));
router.post('/concepts', protect, streamMode('concepts'));

// ── Flashcards ───────────────────────────────────────────────────────────────
router.post('/flashcards', protect, async (req, res, next) => {
  try {
    const { noteId } = req.body;
    const count = clampInt(req.body.count, 3, 30, 10);
    const difficulty = pickDifficulty(req.body.difficulty);
    const note = await getNote(noteId, req.user.uid);

    const prompt = `Generate exactly ${count} high-quality study flashcards from these notes.
${DIFFICULTY[difficulty]}
Each answer should be concise (1-3 sentences). Avoid duplicate questions.
Return JSON: {"cards": [{"question": string, "answer": string}, ...]}

Notes:
${sampleChunks(note.chunks, 12)}`;

    const cards = await generateJSONArray(prompt);
    const validated = cards
      .filter(c => c && c.question && c.answer)
      .slice(0, count)
      .map(c => ({ question: String(c.question).trim(), answer: String(c.answer).trim(), learned: false }));
    if (!validated.length) throw new HttpError(502, 'AI returned no usable flashcards — try again');

    const saved = await Flashcard.findOneAndUpdate(
      { userId: req.user.uid, noteId },
      { userId: req.user.uid, noteId, cards: validated },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    recordActivity(req.user.uid);
    return res.status(200).json({ message: 'Flashcards generated', flashcards: saved.cards, _id: saved._id });
  } catch (err) {
    next(err);
  }
});

router.get('/flashcards/:noteId', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.noteId, 'noteId');
    const deck = await Flashcard.findOne({ noteId: req.params.noteId, userId: req.user.uid });
    return res.status(200).json({ flashcards: deck?.cards || [], _id: deck?._id || null });
  } catch (err) {
    next(err);
  }
});

router.patch('/flashcards/:noteId/learned', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.noteId, 'noteId');
    const { cardIndex, learned } = req.body;
    const deck = await Flashcard.findOne({ noteId: req.params.noteId, userId: req.user.uid });
    if (!deck) throw new HttpError(404, 'Flashcard deck not found');
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= deck.cards.length) {
      throw new HttpError(400, 'Invalid cardIndex');
    }
    deck.cards[cardIndex].learned = Boolean(learned);
    deck.markModified('cards');
    await deck.save();
    recordActivity(req.user.uid);
    return res.status(200).json({ message: 'Updated', cards: deck.cards });
  } catch (err) {
    next(err);
  }
});

// ── Multiple-choice quiz ─────────────────────────────────────────────────────
router.post('/mcq', protect, async (req, res, next) => {
  try {
    const count = clampInt(req.body.count, 3, 20, 5);
    const difficulty = pickDifficulty(req.body.difficulty);
    const note = await getNote(req.body.noteId, req.user.uid);

    const prompt = `Generate exactly ${count} multiple-choice questions from these notes.
${DIFFICULTY[difficulty]}
Each question has exactly 4 plausible options and exactly one correct answer. Vary the position of the correct answer.
Return JSON: {"questions": [{"question": string, "options": [4 strings], "correct": 0-3, "explanation": string}, ...]}

Notes:
${sampleChunks(note.chunks, 12)}`;

    const questions = await generateJSONArray(prompt);
    const validated = questions
      .filter(q => q && q.question && Array.isArray(q.options) && q.options.length === 4)
      .map(q => ({
        question:    String(q.question),
        options:     q.options.map(String),
        correct:     Number(q.correct),
        explanation: String(q.explanation || ''),
      }))
      .filter(q => Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3)
      .slice(0, count);
    if (!validated.length) throw new HttpError(502, 'AI returned no usable questions — try again');

    recordActivity(req.user.uid);
    return res.status(200).json({ message: 'MCQs generated', questions: validated, difficulty });
  } catch (err) {
    next(err);
  }
});

router.post('/mcq/attempt', protect, async (req, res, next) => {
  try {
    const { noteId } = req.body;
    assertObjectId(noteId, 'noteId');
    const total = clampInt(req.body.total, 1, 100, 0);
    const score = clampInt(req.body.score, 0, total, 0);
    if (!total) throw new HttpError(400, 'total required');
    const note = await Note.exists({ _id: noteId, userId: req.user.uid });
    if (!note) throw new HttpError(404, 'Note not found');

    const attempt = await QuizAttempt.create({
      userId: req.user.uid,
      noteId,
      score,
      total,
      difficulty:  pickDifficulty(req.body.difficulty),
      durationSec: clampInt(req.body.durationSec, 0, 86400, 0),
    });
    recordActivity(req.user.uid);
    return res.status(201).json({ attempt });
  } catch (err) {
    next(err);
  }
});

router.get('/mcq/attempts/:noteId', protect, async (req, res, next) => {
  try {
    assertObjectId(req.params.noteId, 'noteId');
    const attempts = await QuizAttempt.find({ noteId: req.params.noteId, userId: req.user.uid })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json({ attempts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
