const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const Note     = require('../models/Note');
const Flashcard = require('../models/Flashcard');
const { retrieveRelevantChunks } = require('../utils/chunker');
const { generateTextStream, generateJSON } = require('../utils/gemini');

const getNote = async (noteId, userId) => {
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) throw new Error('Note not found or access denied');
  return note;
};

router.post('/summary', protect, async (req, res) => {
  try {
    const { noteId } = req.body;
    const note       = await getNote(noteId, req.user.uid);
    const context    = retrieveRelevantChunks(note.chunks, '', 6);

    const prompt = `You are an expert study assistant. Based on the following lecture notes, write a clear, structured summary.
Include:
- Main topic and overview
- Key concepts (bullet points)
- Important details and definitions
- Conclusion / takeaways

Notes:
${context}

Write the summary now:`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await generateTextStream(prompt, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Summary error:', err);
    if (!res.headersSent) return res.status(500).json({ message: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

router.post('/concepts', protect, async (req, res) => {
  try {
    const { noteId } = req.body;
    const note       = await getNote(noteId, req.user.uid);
    const context    = retrieveRelevantChunks(note.chunks, '', 6);

    const prompt = `You are a study assistant. Identify and deeply explain the 4-6 most important concepts from these notes.

For each concept:
- Name the concept clearly
- Give a full explanation (2-4 sentences)
- Provide a simple real-world example
- Note why it matters

Notes:
${context}

Explain each concept now:`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await generateTextStream(prompt, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ message: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

router.post('/flashcards', protect, async (req, res) => {
  try {
    const { noteId, count = 8 } = req.body;
    const note    = await getNote(noteId, req.user.uid);
    const context = retrieveRelevantChunks(note.chunks, '', 6);

    const prompt = `You are a study assistant. Generate exactly ${count} high-quality flashcards from these notes.
Return ONLY a valid JSON array. No markdown, no explanation, no extra text.
Each object must have exactly: "question" (string) and "answer" (string).

Notes:
${context}

JSON array:`;

    const cards = await generateJSON(prompt);

    if (!Array.isArray(cards)) throw new Error('Gemini did not return an array');
    const validated = cards
      .filter(c => c.question && c.answer)
      .map(c => ({ question: String(c.question), answer: String(c.answer), learned: false }));

    const saved = await Flashcard.findOneAndUpdate(
      { userId: req.user.uid, noteId },
      { userId: req.user.uid, noteId, cards: validated },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message:    'Flashcards generated',
      flashcards: saved.cards,
      _id:        saved._id,
    });
  } catch (err) {
    console.error('Flashcards error:', err);
    return res.status(500).json({ message: err.message || 'Failed to generate flashcards' });
  }
});

router.post('/mcq', protect, async (req, res) => {
  try {
    const { noteId, count = 5 } = req.body;
    const note    = await getNote(noteId, req.user.uid);
    const context = retrieveRelevantChunks(note.chunks, '', 6);

    const prompt = `You are a study assistant. Generate exactly ${count} multiple-choice questions from these notes.
Return ONLY a valid JSON array. No markdown, no explanation, no extra text.
Each object must have:
- "question": string
- "options": array of exactly 4 strings
- "correct": number (0-3, index of correct option)
- "explanation": string (why the answer is correct)

Notes:
${context}

JSON array:`;

    const questions = await generateJSON(prompt);

    if (!Array.isArray(questions)) throw new Error('Gemini did not return an array');
    const validated = questions
      .filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number')
      .map(q => ({
        question:    String(q.question),
        options:     q.options.map(String),
        correct:     Number(q.correct),
        explanation: String(q.explanation || ''),
      }));

    return res.status(200).json({ message: 'MCQs generated', questions: validated });
  } catch (err) {
    console.error('MCQ error:', err);
    return res.status(500).json({ message: err.message || 'Failed to generate MCQs' });
  }
});

router.patch('/flashcards/:noteId/learned', protect, async (req, res) => {
  try {
    const { cardIndex, learned } = req.body;
    const deck = await Flashcard.findOne({ noteId: req.params.noteId, userId: req.user.uid });
    if (!deck) return res.status(404).json({ message: 'Flashcard deck not found' });

    deck.cards[cardIndex].learned = learned;
    await deck.save();

    return res.status(200).json({ message: 'Updated', cards: deck.cards });
  } catch (err) {
    return res.status(500).json({ message: 'Update failed' });
  }
});

router.get('/flashcards/:noteId', protect, async (req, res) => {
  try {
    const deck = await Flashcard.findOne({ noteId: req.params.noteId, userId: req.user.uid });
    if (!deck) return res.status(404).json({ message: 'No flashcards for this note' });
    return res.status(200).json({ flashcards: deck.cards, _id: deck._id });
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed' });
  }
});

module.exports = router;
