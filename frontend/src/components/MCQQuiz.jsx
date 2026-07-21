import React, { useState } from 'react';

export default function MCQQuiz({ questions }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions?.length) {
    return <p style={s.muted}>Generate an MCQ quiz from the Generate tab.</p>;
  }

  if (done) {
    return (
      <div style={s.center}>
        <h2 style={s.title}>Quiz complete</h2>
        <p style={s.score}>{score} / {questions.length} correct</p>
        <button style={s.btn} onClick={() => { setIndex(0); setSelected(null); setScore(0); setDone(false); }}>
          Retry
        </button>
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

  return (
    <div>
      <div style={s.counter}>Question {index + 1} of {questions.length}</div>
      <h3 style={s.question}>{q.question}</h3>
      <div style={s.options}>
        {q.options.map((opt, i) => {
          let style = s.option;
          if (selected !== null) {
            if (i === q.correct) style = { ...style, ...s.correct };
            else if (i === selected) style = { ...style, ...s.wrong };
          }
          return (
            <button key={i} style={style} onClick={() => pick(i)} disabled={selected !== null}>
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div style={s.explain}>
          <p>{q.explanation}</p>
          <button style={s.btn} onClick={next}>
            {index + 1 >= questions.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  muted:    { color: '#5a5680', fontFamily: "'DM Mono', monospace" },
  center:   { textAlign: 'center' },
  title:    { color: '#f0effe' },
  score:    { fontSize: 24, color: '#6dfabd', fontFamily: "'DM Mono', monospace" },
  counter:  { fontSize: 11, color: '#5a5680', fontFamily: "'DM Mono', monospace", marginBottom: 12 },
  question: { fontSize: 18, color: '#f0effe', marginBottom: 20, lineHeight: 1.4 },
  options:  { display: 'flex', flexDirection: 'column', gap: 8 },
  option:   { padding: '14px 16px', background: '#12121a', border: '1px solid #2a2845', borderRadius: 10, color: '#f0effe', textAlign: 'left', cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontSize: 14 },
  correct:  { borderColor: '#6dfabd', background: 'rgba(109,250,189,.08)' },
  wrong:    { borderColor: '#fa6d8f', background: 'rgba(250,109,143,.08)' },
  explain:  { marginTop: 20, color: '#9893c8', fontSize: 14 },
  btn:      { marginTop: 12, padding: '10px 20px', background: '#7c6dfa', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' },
};
