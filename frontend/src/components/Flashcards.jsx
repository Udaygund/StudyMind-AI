import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './ui/Icon';
import Empty from './ui/Empty';
import { getFlashcards, generateFlashcards, toggleFlashcardLearned, errMsg } from '../utils/api';
import { downloadFile, slugify, shuffle as shuffleArr, isTyping } from '../utils/helpers';

const COUNTS = [5, 10, 15, 20];
const LEVELS = ['easy', 'medium', 'hard'];

export default function Flashcards({ note, active }) {
  const [cards, setCards]       = useState(null); // null = loading
  const [order, setOrder]       = useState([]);   // indexes into `cards`
  const [pos, setPos]           = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [onlyNew, setOnlyNew]   = useState(false);
  const [generating, setGen]    = useState(false);
  const [count, setCount]       = useState(10);
  const [level, setLevel]       = useState('medium');
  const [showSetup, setSetup]   = useState(false);

  const resetOrder = useCallback((list, unlearnedOnly = onlyNew) => {
    const idx = list.map((_, i) => i).filter((i) => !unlearnedOnly || !list[i].learned);
    setOrder(idx);
    setPos(0);
    setFlipped(false);
  }, [onlyNew]);

  useEffect(() => {
    let alive = true;
    getFlashcards(note._id)
      .then(({ data }) => {
        if (!alive) return;
        const list = data.flashcards || [];
        setCards(list);
        resetOrder(list, false);
      })
      .catch((err) => { if (alive) { setCards([]); toast.error(errMsg(err, 'Could not load flashcards')); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note._id]);

  const generate = async () => {
    setGen(true);
    try {
      const { data } = await generateFlashcards(note._id, count, level);
      setCards(data.flashcards);
      setOnlyNew(false);
      resetOrder(data.flashcards, false);
      setSetup(false);
      toast.success(`${data.flashcards.length} flashcards ready`);
    } catch (err) {
      toast.error(errMsg(err, 'Failed to generate flashcards'));
    } finally {
      setGen(false);
    }
  };

  const cardIndex = order[pos];
  const card = cards && cardIndex != null ? cards[cardIndex] : null;
  const learnedCount = useMemo(() => (cards || []).filter((c) => c.learned).length, [cards]);

  const go = useCallback((delta) => {
    setPos((p) => Math.min(Math.max(0, p + delta), Math.max(0, order.length - 1)));
    setFlipped(false);
  }, [order.length]);

  const toggleLearned = useCallback(async () => {
    if (cardIndex == null || !cards) return;
    const learned = !cards[cardIndex].learned;
    setCards((prev) => prev.map((c, i) => (i === cardIndex ? { ...c, learned } : c)));
    try {
      await toggleFlashcardLearned(note._id, cardIndex, learned);
      if (learned && pos < order.length - 1) setTimeout(() => go(1), 250);
    } catch (err) {
      setCards((prev) => prev.map((c, i) => (i === cardIndex ? { ...c, learned: !learned } : c)));
      toast.error(errMsg(err, 'Could not update card'));
    }
  }, [cardIndex, cards, note._id, pos, order.length, go]);

  const doShuffle = useCallback(() => {
    setOrder((o) => shuffleArr(o));
    setPos(0);
    setFlipped(false);
    toast('Deck shuffled', { duration: 1200 });
  }, []);

  const toggleFilter = () => {
    const next = !onlyNew;
    setOnlyNew(next);
    resetOrder(cards, next);
  };

  // Keyboard shortcuts (only while this view is visible).
  useEffect(() => {
    if (!active || !card) return undefined;
    const onKey = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key.toLowerCase() === 'l') toggleLearned();
      else if (e.key.toLowerCase() === 's') doShuffle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, card, go, toggleLearned, doShuffle]);

  const exportAnki = () => {
    const esc = (s) => s.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    downloadFile(`${slugify(note.title)}-flashcards.txt`, cards.map((c) => `${esc(c.question)}\t${esc(c.answer)}`).join('\n'), 'text/plain');
    toast.success('Exported — import into Anki as tab-separated text');
  };

  const setup = (
    <div className="card quiz-setup fade-in">
      <div className="empty-icon" style={{ margin: '0 auto 12px' }}><Icon name="cards" size={24} /></div>
      <h3 style={{ fontSize: 17, fontWeight: 600 }}>{cards?.length ? 'Generate a new deck' : 'Create flashcards'}</h3>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 20px' }}>
        {cards?.length ? 'This replaces your current deck and its progress.' : `AI will write question/answer cards from “${note.title}”.`}
      </p>
      <div className="field"><span className="label">Number of cards</span>
        <div className="segmented">{COUNTS.map((n) => <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>{n}</button>)}</div>
      </div>
      <div className="field"><span className="label">Difficulty</span>
        <div className="segmented">{LEVELS.map((l) => <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)} style={{ textTransform: 'capitalize' }}>{l}</button>)}</div>
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
        {cards?.length > 0 && <button className="btn btn-ghost" onClick={() => setSetup(false)} disabled={generating}>Cancel</button>}
        <button className="btn btn-primary btn-lg" onClick={generate} disabled={generating}>
          {generating ? <><span className="spinner" /> Writing cards…</> : <><Icon name="sparkles" /> Generate {count} cards</>}
        </button>
      </div>
    </div>
  );

  if (cards === null) {
    return <div className="fc-wrap"><div className="skeleton" style={{ height: 300, borderRadius: 22 }} /></div>;
  }
  if (!cards.length || showSetup) return setup;

  return (
    <div className="fc-wrap">
      <div className="toolbar">
        <span className="badge green"><Icon name="check" size={12} /> {learnedCount}/{cards.length} learned</span>
        <div className="spacer" />
        <button className={`btn btn-sm ${onlyNew ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleFilter} title="Show only cards you haven't learned">
          <Icon name="eye" size={13} /> {onlyNew ? 'Unlearned only' : 'All cards'}
        </button>
        <button className="icon-btn" onClick={doShuffle} title="Shuffle (S)" aria-label="Shuffle"><Icon name="shuffle" /></button>
        <button className="icon-btn" onClick={exportAnki} title="Export to Anki" aria-label="Export"><Icon name="download" /></button>
        <button className="icon-btn" onClick={() => setSetup(true)} title="New deck" aria-label="New deck"><Icon name="refresh" /></button>
      </div>

      {!card ? (
        <Empty icon="trophy" title="Deck mastered"
          action={<button className="btn btn-secondary" onClick={toggleFilter}>Review all cards</button>}>
          You've mastered every card in this deck.
        </Empty>
      ) : (
        <>
          <div className="row" style={{ gap: 12 }}>
            <span className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{pos + 1} / {order.length}</span>
            <div className="bar"><div style={{ width: `${((pos + 1) / order.length) * 100}%` }} /></div>
          </div>

          <div className="fc-stage">
            <div className={`fc${flipped ? ' flipped' : ''}`} onClick={() => setFlipped((f) => !f)}
              role="button" tabIndex={0} aria-label={flipped ? 'Show question' : 'Reveal answer'}>
              <div className="fc-face front">
                <div className="row"><span className="badge accent">Question</span>{card.learned && <span className="badge green"><Icon name="check" size={11} /> Learned</span>}</div>
                <div className="fc-text">{card.question}</div>
                <div className="fc-foot"><span>Tap or press <span className="kbd">space</span> to flip</span><span>#{cardIndex + 1}</span></div>
              </div>
              <div className="fc-face back">
                <div className="row"><span className="badge green">Answer</span></div>
                <div className="fc-text">{card.answer}</div>
                <div className="fc-foot"><span>Did you get it right?</span><span>#{cardIndex + 1}</span></div>
              </div>
            </div>
          </div>

          <div className="fc-nav">
            <button className="btn btn-secondary" onClick={() => go(-1)} disabled={pos === 0}><Icon name="left" size={14} /> Prev</button>
            <button className={`btn ${card.learned ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleLearned}>
              <Icon name="check" size={14} /> {card.learned ? 'Unmark' : 'Got it'}
            </button>
            <button className="btn btn-secondary" onClick={() => go(1)} disabled={pos >= order.length - 1}>Next <Icon name="right" size={14} /></button>
          </div>

          <div className="shortcuts">
            <span><span className="kbd">space</span> flip</span>
            <span><span className="kbd">←</span><span className="kbd">→</span> navigate</span>
            <span><span className="kbd">L</span> learned</span>
            <span><span className="kbd">S</span> shuffle</span>
          </div>
        </>
      )}
    </div>
  );
}
