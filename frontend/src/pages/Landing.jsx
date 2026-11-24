import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/ui/Icon';
import '../landing.css';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ── Scroll reveal ─────────────────────────────────────────────────────── */
function useReveal(rootRef) {
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-reveal], .sweep-root') || [];
    if (!('IntersectionObserver' in window) || reducedMotion()) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/* ── Hero demo: a tiny working version of the app ──────────────────────── */
const SUMMARY = [
  'Glycolysis splits glucose into two pyruvate in the cytoplasm — net 2 ATP.',
  'Pyruvate becomes acetyl-CoA and enters the Krebs cycle in the matrix.',
  'The electron transport chain uses NADH to pump protons; O₂ takes the electrons.',
  'ATP synthase rides that proton gradient — roughly 26–28 ATP per glucose.',
];
const QUIZ = {
  q: 'Without oxygen, which stage stops first?',
  options: ['Glycolysis', 'Electron transport chain', 'Fermentation', 'Krebs cycle'],
  right: 1,
  why: 'O₂ is the final electron acceptor — no O₂, nowhere for electrons to go, so the chain backs up.',
};
const TABS = [
  { id: 'summary', label: 'Summary', icon: 'book' },
  { id: 'card',    label: 'Flashcard', icon: 'cards' },
  { id: 'quiz',    label: 'Quiz', icon: 'quiz' },
];
const DUR = 7000;

function DemoSummary({ still }) {
  const full = SUMMARY.join('\n');
  const [n, setN] = useState(still ? full.length : 0);
  useEffect(() => {
    if (still) return undefined;
    const id = setInterval(() => setN((x) => (x >= full.length ? x : x + 2)), 18);
    return () => clearInterval(id);
  }, [full.length, still]);
  const shown = full.slice(0, n).split('\n');
  return (
    <div className="demo-summary">
      <h5>Overview</h5>
      <ul>
        {shown.map((t, i) => (
          <li key={i}>{t}{i === shown.length - 1 && n < full.length && <span className="caret" />}</li>
        ))}
      </ul>
    </div>
  );
}

function DemoCard({ still }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (still) return undefined;
    const t = setTimeout(() => setFlipped(true), 2400);
    return () => clearTimeout(t);
  }, [still]);
  return (
    <div>
      <div className="demo-fc-stage">
        <div className={`demo-fc${flipped ? ' flipped' : ''}`} onClick={() => setFlipped((f) => !f)} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), setFlipped((f) => !f))}
          aria-label="Flip card">
          <div className="front"><small>Card 3 of 12</small><span className="q">Where does the Krebs cycle take place?</span></div>
          <div className="back"><small>Answer</small><p>In the <span className="mark">mitochondrial matrix</span> — one turn per acetyl-CoA.</p></div>
        </div>
      </div>
      <div className="demo-keys">
        <span><span className="kbd">space</span> flip &nbsp; <span className="kbd">L</span> got it</span>
        <span style={{ fontFamily: 'var(--mono)' }}>4 / 12 learned</span>
      </div>
    </div>
  );
}

function DemoQuiz({ still }) {
  const [step, setStep] = useState(still ? 3 : 0);
  useEffect(() => {
    if (still) return undefined;
    const ts = [900, 1800, 2700].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, [still]);
  const hover = step === 1 ? 0 : step === 2 ? 1 : -1;
  return (
    <div className="demo-quiz">
      <div className="q">{QUIZ.q}</div>
      {QUIZ.options.map((o, i) => {
        let cls = 'demo-opt';
        if (step === 3) cls += i === QUIZ.right ? ' right' : ' dim';
        else if (i === hover) cls += ' hover';
        return (
          <div key={o} className={cls}>
            <b>{'ABCD'[i]}</b>{o}
            {step === 3 && i === QUIZ.right && <Icon name="check" size={14} style={{ marginLeft: 'auto', color: 'var(--green)' }} />}
          </div>
        );
      })}
      {step === 3 && <div className="demo-why">{QUIZ.why}</div>}
    </div>
  );
}

function HeroDemo() {
  const [tab, setTab] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [auto, setAuto] = useState(() => !reducedMotion());
  const [hovered, setHovered] = useState(false);
  const timer = useRef(null);
  const started = useRef(0);
  const remaining = useRef(DUR);

  // Auto-advance, pausing while hovered (and resuming where it left off).
  useEffect(() => {
    if (!auto) return undefined;
    if (hovered) {
      remaining.current -= Date.now() - started.current;
      return undefined;
    }
    started.current = Date.now();
    timer.current = setTimeout(() => {
      remaining.current = DUR;
      setTab((t) => (t + 1) % TABS.length);
      setCycle((c) => c + 1);
    }, Math.max(0, remaining.current));
    return () => clearTimeout(timer.current);
  }, [auto, hovered, tab, cycle]);

  const pick = (i) => {
    setAuto(false);
    setTab(i);
    setCycle((c) => c + 1);
  };

  const still = reducedMotion();
  const Pane = [DemoSummary, DemoCard, DemoQuiz][tab];

  return (
    <div className="demo-stack" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="annot annot-1" aria-hidden="true">
        <span>it's live — click around</span>
        <svg width="46" height="40" viewBox="0 0 46 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M4 4c10 2 22 10 26 26" /><path d="M23 26l7 6 3-9" />
        </svg>
      </div>
      <div className="demo-sheet" />
      <div className={`demo${hovered ? ' paused' : ''}`}>
        <div className="demo-doc">
          <div className="meta"><span>bio_lecture_06.pdf</span><span>p. 4 of 11</span></div>
          <h4>Lecture 6 — Cellular respiration</h4>
          <p>Glucose is oxidised in three linked stages. Glycolysis occurs in the cytoplasm and yields pyruvate, which is transported into the mitochondrion and converted to acetyl-CoA…</p>
        </div>
        <div className="demo-tabs" role="tablist">
          {TABS.map((t, i) => (
            <button key={t.id} role="tab" aria-selected={tab === i} className={`demo-tab${tab === i ? ' on' : ''}`} onClick={() => pick(i)} style={{ '--dur': `${DUR}ms` }}>
              <Icon name={t.icon} size={14} /> {t.label}
              {auto && <span className="tick"><i key={cycle} /></span>}
            </button>
          ))}
        </div>
        <div className="demo-body">
          <Pane key={`${tab}-${cycle}`} still={still} />
        </div>
      </div>
    </div>
  );
}

/* ── Small illustrations ───────────────────────────────────────────────── */
const CHUNKS = [
  [92, 0], [78, 1], [86, 0], [64, 0], [95, 1], [70, 0], [88, 1],
];
const TOOLS = ['Summary', 'Mind map', 'Flashcards', 'Quiz', 'Study plan', 'Explain simply', 'Chat'];
const CAL = [0,1,0,2,3,0,0, 1,2,0,3,2,1,0, 0,3,2,2,0,1,3, 2,0,1,3,3,2,0, 1,2,3,0,2,3,3, 0,1,2,3,3,2,3];
const SUBJECTS = ['Organic Chemistry', 'Constitutional Law', 'Linear Algebra', 'Microeconomics', 'Cell Biology', 'Art History',
  'Thermodynamics', 'Pharmacology', 'Data Structures', 'Modern European History', 'Statistics', 'Neuroscience'];

const FAQ = [
  ['What can I upload?', 'PDFs, plain-text and Markdown files up to 15 MB, or you can paste text directly. Scanned PDFs that are only images won’t work yet — if you can select the text in your PDF viewer, StudyMind can read it.'],
  ['Will it make things up?', 'It’s instructed to answer only from your notes and to tell you when they don’t cover something. It is still an AI, so double-check anything that matters for a grade — numbers and dates especially.'],
  ['Who can see my notes?', 'Only you. Notes are tied to your Google account, and deleting a note also deletes its chats, flashcards and quiz history.'],
  ['Does it work on my phone?', 'Yes. Everything — including flashcards and quizzes — works in a mobile browser. There’s nothing to install.'],
  ['What does it cost?', 'StudyMind is free to use. Sign in with Google and you can start with your first set of notes straight away.'],
];

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function Landing() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const root = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  useReveal(root);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const start = () => navigate(user ? '/app' : '/login');
  const ctaLabel = user ? 'Open your desk' : 'Start studying';
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="lp" ref={root}>
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-wrap">
          <Link to="/" className="lp-brand" aria-label="StudyMind home">
            <span className="logo-mark"><Icon name="logo" size={17} /></span>
            <span className="logo-text">Study<em>mind</em></span>
          </Link>
          <div className="lp-links">
            <a href="#how" onClick={scrollTo('how')}>How it works</a>
            <a href="#features" onClick={scrollTo('features')}>Features</a>
            <a href="#faq" onClick={scrollTo('faq')}>Questions</a>
          </div>
          <span className="spacer" />
          <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          {!user && <Link to="/login" className="lp-links signin" style={{ marginLeft: 0, color: 'var(--text-2)', fontSize: 14 }}>Sign in</Link>}
          <button className="btn-ink sm" onClick={start}>{ctaLabel} <span className="arrow">→</span></button>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-wrap">
          <div>
            <span className="eyebrow" data-reveal>An AI study desk for your own notes</span>
            <h1 className="lp-h1">
              <span className="line"><span style={{ '--d': '80ms' }}>Stop re-reading.</span></span>
              <span className="line"><span style={{ '--d': '220ms' }}>Start <em className="sweep sweep-root" style={{ '--d': '1000ms' }}>remembering.</em></span></span>
            </h1>
            <p className="lp-lede" data-reveal style={{ '--d': '380ms' }}>
              Drop in a lecture PDF or a page of messy notes. StudyMind writes the summary, the flashcards
              and the practice quiz — and answers your questions using only what’s in your notes.
            </p>
            <div className="lp-cta" data-reveal style={{ '--d': '480ms' }}>
              <button className="btn-ink" onClick={start}>{ctaLabel} — it’s free <span className="arrow">→</span></button>
              <a href="#how" className="btn-line" onClick={scrollTo('how')}>See how it works</a>
            </div>
            <div className="lp-formats" data-reveal style={{ '--d': '580ms' }}>
              <span className="label">Reads</span>
              {['.pdf', '.md', '.txt', 'pasted text'].map((f) => <span key={f} className="fmt">{f}</span>)}
            </div>
          </div>
          <div data-reveal style={{ '--d': '300ms' }}>
            <HeroDemo />
          </div>
        </div>
      </header>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...SUBJECTS, ...SUBJECTS].map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>

      {/* How it works */}
      <section className="lp-section" id="how">
        <div className="lp-wrap">
          <div className="sec-head">
            <div className="sec-num" data-reveal><b>01</b> &nbsp;/ How it works</div>
            <div>
              <h2 className="lp-h2" data-reveal>Three steps. <em>About a minute.</em></h2>
              <p className="lp-sub" data-reveal style={{ '--d': '100ms', marginTop: 16 }}>
                No templates to fill in and no decks to build by hand. You bring the material; StudyMind does the busywork.
              </p>
            </div>
          </div>

          <div className="steps">
            <div className="step" data-reveal>
              <div className="step-n">i.</div>
              <h3>Hand over your notes</h3>
              <p>A PDF from the course portal, a Markdown file, or text pasted straight from your notes app.</p>
              <div className="step-art">
                <div className="file-chip">
                  <span className="ext">PDF</span>
                  <div style={{ flex: 1 }}><div className="nm">bio_lecture_06.pdf</div><div className="sz">2.4 MB · 11 pages</div></div>
                </div>
                <div className="up-bar"><i /></div>
                <div className="up-ok">✓ uploaded</div>
              </div>
            </div>
            <div className="step" data-reveal style={{ '--d': '120ms' }}>
              <div className="step-n">ii.</div>
              <h3>It reads every page</h3>
              <p>Your notes are split into sections and indexed, so answers come from your material — not the open internet.</p>
              <div className="step-art">
                <div className="chunks">
                  {CHUNKS.map(([w, hit], i) => <i key={i} className={hit ? 'hit' : ''} style={{ width: `${w}%`, '--d': `${600 + i * 160}ms` }} />)}
                </div>
                <div className="chunks-meta"><span>18 sections</span><span>“krebs” · 3 matches</span></div>
              </div>
            </div>
            <div className="step" data-reveal style={{ '--d': '240ms' }}>
              <div className="step-n">iii.</div>
              <h3>Study the way you like</h3>
              <p>Summaries, mind maps, flashcards, quizzes, a five-day plan — or just ask it questions.</p>
              <div className="step-art">
                <div className="tools">
                  {TOOLS.map((t, i) => <span key={t} className={`tool${t === 'Flashcards' ? ' on' : ''}`} style={{ '--d': `${500 + i * 90}ms` }}>{t}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section" id="features" style={{ paddingTop: 40 }}>
        <div className="lp-wrap">
          <div className="sec-head">
            <div className="sec-num" data-reveal><b>02</b> &nbsp;/ What’s on the desk</div>
            <h2 className="lp-h2" data-reveal>Everything you’d make yourself, <em>if you had the time.</em></h2>
          </div>

          <div>
            <div className="feat">
              <div className="feat-copy" data-reveal>
                <span className="k">Chat with your notes</span>
                <h3>Ask anything. It answers from <em>your</em> notes.</h3>
                <p>General chatbots will happily invent a fact that sounds right. StudyMind is told to stick to what you uploaded — and to say so when your notes don’t cover it.</p>
                <ul>
                  <li>Every conversation is saved with its note</li>
                  <li>Suggested questions when you don’t know where to start</li>
                  <li>Stop a long answer mid-sentence</li>
                </ul>
              </div>
              <div className="feat-art" data-reveal style={{ '--d': '120ms' }}>
                <div className="f-chat">
                  <div className="f-q">Why does the chain stop without oxygen?</div>
                  <div className="f-a">
                    Oxygen is the <span className="mark">final electron acceptor</span>. With nothing to pass electrons to, the chain backs up,
                    proton pumping stops, and ATP output collapses to the 2 ATP from glycolysis.
                    <div><span className="f-src"><Icon name="filetext" size={12} /> answered from Lecture 6</span></div>
                  </div>
                  <div className="f-q" style={{ opacity: 0.55 }}>So what does fermentation do?</div>
                </div>
              </div>
            </div>

            <div className="feat">
              <div className="feat-copy" data-reveal>
                <span className="k">Flashcards</span>
                <h3>A deck you didn’t have to <em>write.</em></h3>
                <p>Choose how many cards and how hard. Flip with the space bar, mark what you know, and keep cycling through only the ones you don’t.</p>
                <ul>
                  <li>Shuffle, and an “unlearned only” mode</li>
                  <li>Keyboard-first: space, arrows, L, S</li>
                  <li>Export to Anki for spaced repetition</li>
                </ul>
              </div>
              <div className="feat-art" data-reveal style={{ '--d': '120ms' }}>
                <div className="f-deck">
                  <div className="f-card"><small>Card 7</small>What is chemiosmosis?</div>
                  <div className="f-card"><small>Card 5</small>Net ATP from glycolysis?</div>
                  <div className="f-card"><small>Card 4 · question</small>What is the final electron acceptor?</div>
                </div>
                <div className="f-progress"><span>6 / 10 learned</span><div className="bar"><div /></div></div>
              </div>
            </div>

            <div className="feat">
              <div className="feat-copy" data-reveal>
                <span className="k">Practice quizzes</span>
                <h3>Practice tests that <em>explain</em> the answer.</h3>
                <p>Multiple choice at the difficulty you pick. Every question tells you why the right answer is right, and the end screen walks you through what you missed.</p>
                <ul>
                  <li>Easy, medium or hard</li>
                  <li>Score history for every note</li>
                  <li>A timer, if you want exam conditions</li>
                </ul>
              </div>
              <div className="feat-art" data-reveal style={{ '--d': '120ms' }}>
                <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div><div className="label">Quiz · medium</div><div className="f-score">8<span style={{ color: 'var(--text-3)' }}>/10</span></div></div>
                  <span className="mono muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>6:42</span>
                </div>
                <div className="f-review">
                  <div className="f-row"><span className="n">04</span><div>Where is pyruvate converted to acetyl-CoA?<div className="why">You said: cytoplasm · Correct: mitochondrial matrix</div></div><span className="badge red">missed</span></div>
                  <div className="f-row"><span className="n">05</span><div>What drives ATP synthase?</div><span className="badge green">correct</span></div>
                </div>
              </div>
            </div>

            <div className="feat">
              <div className="feat-copy" data-reveal>
                <span className="k">Showing up</span>
                <h3>Twenty-five minutes <em>at a time.</em></h3>
                <p>A focus timer sits at the top of every page. Each day you study counts toward your streak, and your dashboard shows the last few weeks at a glance.</p>
                <ul>
                  <li>25-minute focus, 5-minute break, with a quiet chime</li>
                  <li>Daily streak and activity history</li>
                  <li>Flashcard mastery across every deck</li>
                </ul>
              </div>
              <div className="feat-art" data-reveal style={{ '--d': '120ms' }}>
                <div className="label" style={{ marginBottom: 12 }}>Last six weeks</div>
                <div className="f-cal">
                  {CAL.map((l, i) => <i key={i} className={l ? `l${l}` : ''} style={{ '--d': `${i * 18}ms` }} />)}
                </div>
                <div className="f-timer"><b>24:13</b><span className="muted">focus · session 3</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="band">
        <div className="lp-wrap">
          <div>
            <span className="eyebrow" data-reveal>03 / Why it’s built around questions</span>
            <blockquote className="sweep-root" data-reveal>
              Re-reading <em>feels</em> like studying. Recalling <em>is</em> studying.
            </blockquote>
          </div>
          <div data-reveal style={{ '--d': '150ms' }}>
            <p>
              Pulling an answer out of memory strengthens it far more than reading it again — psychologists
              call this the testing effect. That’s why StudyMind leans on flashcards, quizzes and questions
              rather than prettier highlights.
            </p>
            <div className="cite">Roediger &amp; Karpicke, “Test-Enhanced Learning,” Psychological Science, 2006.</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section" id="faq">
        <div className="lp-wrap faq">
          <div className="sec-num" data-reveal><b>04</b> &nbsp;/ Questions</div>
          <div className="faq-list" data-reveal>
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0}>
                <summary>{q}<span className="pm" aria-hidden="true" /></summary>
                <p className="ans">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final">
        <div className="lp-wrap">
          <h2 className="lp-h2" data-reveal>The exam is coming <em className="sweep sweep-root">either way.</em></h2>
          <div data-reveal style={{ '--d': '150ms' }}>
            <button className="btn-ink" onClick={start}>{ctaLabel} <span className="arrow">→</span></button>
            <span className="hand">might as well be ready for it.</span>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="row">
            <span>© {new Date().getFullYear()} StudyMind. Made for people with deadlines.</span>
            <span className="row" style={{ gap: 22 }}>
              <a href="#how" onClick={scrollTo('how')}>How it works</a>
              <a href="#features" onClick={scrollTo('features')}>Features</a>
              <a href="#faq" onClick={scrollTo('faq')}>Questions</a>
              <Link to={user ? '/app' : '/login'}>{user ? 'Open app' : 'Sign in'}</Link>
            </span>
          </div>
          <div className="wordmark" aria-hidden="true">Study<em>mind</em></div>
        </div>
      </footer>
    </div>
  );
}
