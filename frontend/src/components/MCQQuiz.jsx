import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './ui/Icon';
import Markdown from './ui/Markdown';
import { generateMCQ, saveQuizAttempt, getQuizAttempts, errMsg } from '../utils/api';
import { formatDuration, isTyping, timeAgo } from '../utils/helpers';

const COUNTS  = [5, 10, 15];
const LEVELS  = ['easy', 'medium', 'hard'];
const LETTERS = ['A', 'B', 'C', 'D'];

function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#c4432a', '#f3d65a', '#2f5d50', '#1c1b18', '#e2ddd0'];
    const parts = Array.from({ length: 140 }, () => ({
      x: canvas.width / 2, y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 4,
      s: Math.random() * 6 + 4, r: Math.random() * Math.PI, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.1; p.vx *= 0.99;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frame / 140);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (++frame < 140) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="confetti" />;
}

export default function MCQQuiz({ note, active }) {
  const [stage, setStage]       = useState('setup'); // setup | quiz | result
  const [questions, setQs]      = useState([]);
  const [answers, setAnswers]   = useState([]);      // selected option per question
  const [index, setIndex]       = useState(0);
  const [count, setCount]       = useState(5);
  const [level, setLevel]       = useState('medium');
  const [loading, setLoading]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [attempts, setAttempts] = useState([]);
  const startRef = useRef(0);

  useEffect(() => {
    let alive = true;
    getQuizAttempts(note._id).then(({ data }) => alive && setAttempts(data.attempts || [])).catch(() => {});
    return () => { alive = false; };
  }, [note._id]);

  // Quiz timer — only ticks while the quiz is visible.
  useEffect(() => {
    if (stage !== 'quiz' || !active) return undefined;
    startRef.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, active]);

  const begin = (qs) => {
    setQs(qs);
    setAnswers(Array(qs.length).fill(null));
    setIndex(0);
    setElapsed(0);
    setStage('quiz');
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await generateMCQ(note._id, count, level);
      begin(data.questions);
    } catch (err) {
      toast.error(errMsg(err, 'Failed to generate quiz'));
    } finally {
      setLoading(false);
    }
  };

  const q = questions[index];
  const selected = answers[index];
  const score = answers.reduce((n, a, i) => n + (a === questions[i]?.correct ? 1 : 0), 0);

  const pick = useCallback((i) => {
    if (stage !== 'quiz' || answers[index] != null) return;
    setAnswers((prev) => prev.map((a, j) => (j === index ? i : a)));
  }, [stage, answers, index]);

  const finish = useCallback(async () => {
    setStage('result');
    const finalScore = answers.reduce((n, a, i) => n + (a === questions[i]?.correct ? 1 : 0), 0);
    try {
      const { data } = await saveQuizAttempt({ noteId: note._id, score: finalScore, total: questions.length, difficulty: level, durationSec: elapsed });
      setAttempts((prev) => [data.attempt, ...prev]);
    } catch { /* non-critical */ }
  }, [answers, questions, note._id, level, elapsed]);

  const next = useCallback(() => {
    if (answers[index] == null) return;
    if (index + 1 >= questions.length) finish();
    else setIndex(index + 1);
  }, [answers, index, questions.length, finish]);

  useEffect(() => {
    if (!active || stage !== 'quiz') return undefined;
    const onKey = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const n = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
      if (n >= 0) { e.preventDefault(); pick(n); }
      else if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, stage, pick, next]);

  // ── Setup ──
  if (stage === 'setup') {
    return (
      <div>
        <div className="card quiz-setup fade-in">
          <div className="empty-icon" style={{ margin: '0 auto 12px' }}><Icon name="quiz" size={24} /></div>
          <h3 style={{ fontSize: 17, fontWeight: 600 }}>Test yourself</h3>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 20px' }}>A multiple-choice quiz generated from “{note.title}”, with explanations.</p>
          <div className="field"><span className="label">Questions</span>
            <div className="segmented">{COUNTS.map((n) => <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>{n}</button>)}</div>
          </div>
          <div className="field"><span className="label">Difficulty</span>
            <div className="segmented">{LEVELS.map((l) => <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)} style={{ textTransform: 'capitalize' }}>{l}</button>)}</div>
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
            {questions.length > 0 && <button className="btn btn-ghost" onClick={() => begin(questions)} disabled={loading}>Retake last quiz</button>}
            <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading}>
              {loading ? <><span className="spinner" /> Writing questions…</> : <><Icon name="sparkles" /> Start quiz</>}
            </button>
          </div>
        </div>

        {attempts.length > 0 && (
          <div className="card panel" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            <div className="panel-head"><h3>Past attempts</h3><span className="muted" style={{ fontSize: 12 }}>best {Math.max(...attempts.map((a) => Math.round((a.score / a.total) * 100)))}%</span></div>
            <div className="list">
              {attempts.slice(0, 6).map((a) => {
                const pct = Math.round((a.score / a.total) * 100);
                return (
                  <div key={a._id} className="list-row">
                    <span className={`badge ${pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'}`}>{pct}%</span>
                    <span style={{ flex: 1 }}>{a.score}/{a.total} · <span style={{ textTransform: 'capitalize' }}>{a.difficulty}</span></span>
                    {a.durationSec > 0 && <span className="muted" style={{ fontSize: 12 }}>{formatDuration(a.durationSec)}</span>}
                    <span className="muted" style={{ fontSize: 12 }}>{timeAgo(a.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Result ──
  if (stage === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {pct >= 80 && active && <Confetti />}
        <div className="card result fade-in">
          <div className="label" style={{ marginBottom: 10 }}>Your score</div>
          <div className="result-score">{score}/{questions.length}</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginTop: 8 }}>
            {pct >= 80 ? 'Outstanding work!' : pct >= 50 ? 'Solid effort — review the misses below.' : 'Keep practicing — you\'ll get there.'}
          </p>
          <p className="muted" style={{ fontSize: 13 }}>{pct}% · {formatDuration(elapsed)} · <span style={{ textTransform: 'capitalize' }}>{level}</span></p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => begin(questions)}><Icon name="reset" size={14} /> Retry</button>
            <button className="btn btn-primary" onClick={() => setStage('setup')}><Icon name="sparkles" size={14} /> New quiz</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="panel-head" style={{ padding: '16px 16px 0' }}><h3>Review</h3></div>
          {questions.map((qq, i) => {
            const ok = answers[i] === qq.correct;
            return (
              <div key={i} className="review-item">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className={`badge ${ok ? 'green' : 'red'}`}>{ok ? <Icon name="check" size={11} /> : <Icon name="x" size={11} />}{i + 1}</span>
                  <b style={{ fontSize: 14, fontWeight: 500 }}>{qq.question}</b>
                </div>
                <div style={{ fontSize: 13, marginTop: 6, paddingLeft: 4 }}>
                  {!ok && answers[i] != null && <div style={{ color: 'var(--red)' }}>Your answer: {qq.options[answers[i]]}</div>}
                  <div style={{ color: 'var(--green)' }}>Correct: {qq.options[qq.correct]}</div>
                  {qq.explanation && <div className="muted" style={{ marginTop: 4 }}><Markdown>{qq.explanation}</Markdown></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Quiz ──
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>Question {index + 1} of {questions.length}</span>
        <div className="bar"><div style={{ width: `${((index + (selected != null ? 1 : 0)) / questions.length) * 100}%` }} /></div>
        <span className="badge"><Icon name="timer" size={12} /> {formatDuration(elapsed)}</span>
        <span className="badge green"><Icon name="check" size={12} /> {score}</span>
      </div>

      <h3 className="quiz-q">{q.question}</h3>

      <div className="options">
        {q.options.map((opt, i) => {
          let cls = 'option';
          if (selected != null) {
            if (i === q.correct) cls += ' correct';
            else if (i === selected) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={i} className={cls} onClick={() => pick(i)} disabled={selected != null}>
              <span className="letter">{LETTERS[i]}</span>
              <span style={{ flex: 1 }}>{opt}</span>
              {selected != null && i === q.correct && <Icon name="check" style={{ color: 'var(--green)' }} />}
              {selected === i && i !== q.correct && <Icon name="x" style={{ color: 'var(--red)' }} />}
            </button>
          );
        })}
      </div>

      {selected != null && (
        <div className="explain">
          <div className="row" style={{ marginBottom: 6 }}>
            <span className={`badge ${selected === q.correct ? 'green' : 'red'}`}>{selected === q.correct ? 'Correct!' : 'Not quite'}</span>
          </div>
          {q.explanation && <Markdown>{q.explanation}</Markdown>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-primary" onClick={next} autoFocus>
              {index + 1 >= questions.length ? 'See results' : 'Next question'} <Icon name="right" size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="shortcuts">
        <span><span className="kbd">1</span>–<span className="kbd">4</span> answer</span>
        <span><span className="kbd">↵</span> next</span>
      </div>
    </div>
  );
}
