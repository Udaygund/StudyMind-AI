import React, { useState } from 'react';

export default function MCQQuiz({ questions }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions?.length) {
    return <p style={s.muted}>Generate a quiz from the Generate tab.</p>;
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={s.resultWrap}>
        <div style={s.resultCard}>
          <div style={s.resultScore}>{score}/{questions.length}</div>
          <div style={s.resultPct}>{pct}%</div>
          <div style={s.resultLabel}>
            {pct >= 80 ? 'Well done' : pct >= 50 ? 'Not bad' : 'Keep practicing'}
          </div>
          <button
            style={s.btn}
            onClick={() => { setIndex(0); setSelected(null); setScore(0); setDone(false); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];

  const pick = (i) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.correct) setScore(s => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) setDone(true);
    else { setIndex(index + 1); setSelected(null); }
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div>
      <div style={s.progress}>
        <span style={s.progressText}>{index + 1} / {questions.length}</span>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <h3 style={s.question}>{q.question}</h3>

      <div style={s.options}>
        {q.options.map((opt, i) => {
          let style = { ...s.option };
          if (selected !== null) {
            if (i === q.correct) {
              style.borderColor = 'var(--green)';
              style.background = 'var(--green-muted)';
              style.color = 'var(--green)';
            } else if (i === selected) {
              style.borderColor = 'var(--red)';
              style.background = 'var(--red-muted)';
              style.color = 'var(--red)';
            }
          }
          return (
            <button key={i} style={style} onClick={() => pick(i)} disabled={selected !== null}>
              <span style={s.optionLetter}>{letters[i]}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div style={s.explain}>
          <div style={s.explainText}>{q.explanation}</div>
          <button style={s.btn} onClick={next}>
            {index + 1 >= questions.length ? 'Finish' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  muted: {
    color: 'var(--text-2)',
    fontSize: 13,
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
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
  question: {
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--text-0)',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-1)',
    textAlign: 'left',
    fontSize: 13,
    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
  },
  optionLetter: {
    width: 22,
    height: 22,
    borderRadius: 5,
    background: 'var(--bg-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-2)',
    flexShrink: 0,
  },
  explain: {
    marginTop: 20,
    padding: 14,
    background: 'var(--bg-2)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border-subtle)',
  },
  explainText: {
    color: 'var(--text-1)',
    fontSize: 13,
    lineHeight: 1.6,
    marginBottom: 14,
  },
  btn: {
    padding: '8px 16px',
    background: 'var(--text-0)',
    color: 'var(--bg-0)',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: 13,
    transition: 'opacity 0.15s',
  },
  resultWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  resultCard: {
    textAlign: 'center',
  },
  resultScore: {
    fontSize: 48,
    fontWeight: 600,
    color: 'var(--text-0)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    marginBottom: 4,
  },
  resultPct: {
    fontSize: 14,
    color: 'var(--text-2)',
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 13,
    color: 'var(--text-2)',
    marginBottom: 24,
  },
};
