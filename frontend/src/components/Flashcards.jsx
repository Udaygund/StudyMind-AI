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
      <div style={s.progress}>
        <span style={s.progressText}>{index + 1} / {cards.length}</span>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
      </div>

      <div style={s.card} onClick={() => setFlipped(!flipped)}>
        <div style={s.cardLabel}>{flipped ? 'Answer' : 'Question'}</div>
        <div style={s.cardText}>{flipped ? card.answer : card.question}</div>
        <div style={s.flipHint}>Click to {flipped ? 'see question' : 'reveal answer'}</div>
      </div>

      <div style={s.nav}>
        <button
          style={{ ...s.navBtn, ...(index === 0 ? s.navBtnDisabled : {}) }}
          onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped(false); }}
          disabled={index === 0}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>
        <button
          style={{ ...s.navBtn, ...(card.learned ? s.learnedBtn : {}) }}
          onClick={toggleLearned}
        >
          {card.learned ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Learned
            </>
          ) : 'Mark learned'}
        </button>
        <button
          style={{ ...s.navBtn, ...(index === cards.length - 1 ? s.navBtnDisabled : {}) }}
          onClick={() => { setIndex(Math.min(cards.length - 1, index + 1)); setFlipped(false); }}
          disabled={index === cards.length - 1}
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const s = {
  muted: {
    color: 'var(--text-2)',
    fontSize: 13,
  },
  wrap: {
    maxWidth: 480,
    margin: '0 auto',
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    color: 'var(--text-2)',
    fontVariantNumeric: 'tabular-nums',
  },
  progressBar: {
    flex: 1,
    height: 3,
    background: 'var(--bg-3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--text-2)',
    borderRadius: 2,
    transition: 'width 0.2s ease',
  },
  card: {
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px 28px',
    minHeight: 200,
    cursor: 'pointer',
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.15s',
  },
  cardLabel: {
    fontSize: 11,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 16,
  },
  cardText: {
    fontSize: 16,
    color: 'var(--text-0)',
    lineHeight: 1.6,
    flex: 1,
  },
  flipHint: {
    fontSize: 11,
    color: 'var(--text-2)',
    marginTop: 16,
    opacity: 0.6,
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-1)',
    fontWeight: 500,
    fontSize: 12,
    transition: 'border-color 0.15s, color 0.15s',
  },
  navBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  learnedBtn: {
    borderColor: 'var(--green)',
    color: 'var(--green)',
  },
};
