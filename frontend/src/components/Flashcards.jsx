import React, { useState } from 'react';
import { toggleFlashcardLearned } from '../utils/api';

export default function Flashcards({ cards, noteId, onUpdate }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards?.length) {
    return <p style={s.muted}>Generate flashcards from the Generate tab.</p>;
  }

  const card = cards[index];

  const toggleLearned = async () => {
    if (!noteId) return;
    const learned = !card.learned;
    try {
      const { data } = await toggleFlashcardLearned(noteId, index, learned);
      onUpdate(data.cards);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.counter}>{index + 1} / {cards.length}</div>
      <div style={s.card} onClick={() => setFlipped(!flipped)}>
        <div style={s.label}>{flipped ? 'Answer' : 'Question'}</div>
        <div style={s.text}>{flipped ? card.answer : card.question}</div>
      </div>
      <div style={s.actions}>
        <button style={s.btn} onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped(false); }}>← Prev</button>
        <button style={{ ...s.btn, ...(card.learned ? s.learned : {}) }} onClick={toggleLearned}>
          {card.learned ? '✓ Learned' : 'Mark learned'}
        </button>
        <button style={s.btn} onClick={() => { setIndex(Math.min(cards.length - 1, index + 1)); setFlipped(false); }}>Next →</button>
      </div>
    </div>
  );
}

const s = {
  muted:   { color: '#5a5680', fontFamily: "'DM Mono', monospace" },
  wrap:    { textAlign: 'center' },
  counter: { fontSize: 11, color: '#5a5680', fontFamily: "'DM Mono', monospace", marginBottom: 12 },
  card:    { background: '#12121a', border: '1px solid #2a2845', borderRadius: 14, padding: 32, minHeight: 160, cursor: 'pointer', marginBottom: 20 },
  label:   { fontSize: 10, color: '#7c6dfa', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 },
  text:    { fontSize: 16, color: '#f0effe', lineHeight: 1.6 },
  actions: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  btn:     { padding: '10px 16px', background: '#1a1a26', border: '1px solid #2a2845', borderRadius: 8, color: '#f0effe', cursor: 'pointer', fontFamily: "'Syne', sans-serif" },
  learned: { borderColor: '#6dfabd', color: '#6dfabd' },
};
