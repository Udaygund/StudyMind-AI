const express = require('express');
const { protect } = require('../middleware/auth');
const Note        = require('../models/Note');
const Flashcard   = require('../models/Flashcard');
const QuizAttempt = require('../models/QuizAttempt');
const Session     = require('../models/Session');
const User        = require('../models/User');
const { computeStreak } = require('../utils/activity');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const [notes, decks, attempts, chats, user] = await Promise.all([
      Note.countDocuments({ userId: uid }),
      Flashcard.find({ userId: uid }).select('cards.learned').lean(),
      QuizAttempt.find({ userId: uid }).sort({ createdAt: -1 }).limit(50).lean(),
      Session.countDocuments({ userId: uid, 'messages.0': { $exists: true } }),
      User.findOne({ uid }).select('activityDays').lean(),
    ]);

    const totalCards   = decks.reduce((n, d) => n + d.cards.length, 0);
    const learnedCards = decks.reduce((n, d) => n + d.cards.filter(c => c.learned).length, 0);
    const avgQuiz = attempts.length
      ? Math.round(attempts.reduce((n, a) => n + (a.score / a.total) * 100, 0) / attempts.length)
      : null;

    const days = user?.activityDays || [];
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      last14.push({ date: key, active: days.includes(key) });
    }

    return res.status(200).json({
      notes,
      chats,
      totalCards,
      learnedCards,
      quizzesTaken: attempts.length,
      avgQuiz,
      streak: computeStreak(days),
      activity: last14,
      recentQuizzes: attempts.slice(0, 10).map(a => ({
        noteId: a.noteId, score: a.score, total: a.total, difficulty: a.difficulty, createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
