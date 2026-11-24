import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './ui/Icon';
import Markdown from './ui/Markdown';
import { streamSSE } from '../utils/api';
import { copyText, downloadFile, slugify, plainText } from '../utils/helpers';

export const MODES = [
  { id: 'summary',   label: 'Summary',      desc: 'Structured overview with key points',  icon: 'book',      color: 'accent' },
  { id: 'concepts',  label: 'Key concepts', desc: 'Deep dives with real-world examples',  icon: 'lightbulb', color: 'amber' },
  { id: 'eli5',      label: 'Explain simply', desc: 'Plain-language explanation with analogies', icon: 'baby', color: 'green' },
  { id: 'mindmap',   label: 'Mind map',     desc: 'Hierarchical outline of every topic',  icon: 'network',   color: 'accent' },
  { id: 'studyplan', label: 'Study plan',   desc: '5-day plan with active-recall tasks',  icon: 'calendar',  color: 'red' },
  { id: 'mnemonics', label: 'Memory hooks', desc: 'Mnemonics for the hard-to-remember',   icon: 'zap',       color: 'amber' },
];

export default function Generator({ note, outputs, setOutput, onNavigate }) {
  const [mode, setMode]       = useState(() => MODES.find((m) => outputs[m.id])?.id || null);
  const [loading, setLoading] = useState(null);
  const [speaking, setSpeak]  = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const run = async (id) => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    setSpeak(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setMode(id);
    setLoading(id);
    let text = '';
    setOutput(note._id, id, '');
    try {
      await streamSSE(`/generate/stream/${id}`, { noteId: note._id }, {
        signal: controller.signal,
        onChunk: (chunk) => { text += chunk; setOutput(note._id, id, text); },
      });
    } catch (err) {
      if (err.name !== 'AbortError') toast.error(err.message);
    } finally {
      if (abortRef.current === controller) setLoading(null);
    }
  };

  const stop = () => { abortRef.current?.abort(); setLoading(null); };

  const output = mode ? outputs[mode] : '';
  const current = MODES.find((m) => m.id === mode);

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return toast.error('Text-to-speech is not supported in this browser');
    if (speaking) { synth.cancel(); setSpeak(false); return; }
    const u = new SpeechSynthesisUtterance(plainText(output));
    u.rate = 1.02;
    u.onend = () => setSpeak(false);
    u.onerror = () => setSpeak(false);
    synth.speak(u);
    setSpeak(true);
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Study tools</h2>
          <p>Generate AI study material from <b style={{ color: 'var(--text)' }}>{note.title}</b>.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('flashcards')}><Icon name="cards" size={14} /> Flashcards</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('quiz')}><Icon name="quiz" size={14} /> Quiz</button>
        </div>
      </div>

      <div className="modes">
        {MODES.map((m) => (
          <button key={m.id} className={`mode${mode === m.id ? ' on' : ''}`} onClick={() => (outputs[m.id] && !loading ? setMode(m.id) : run(m.id))} disabled={Boolean(loading) && loading !== m.id}>
            <span className="mode-icon" style={{ background: `var(--${m.color}-soft)`, color: `var(--${m.color})` }}>
              {loading === m.id ? <span className="spinner" /> : <Icon name={m.icon} size={17} />}
            </span>
            <div>
              <b>{m.label}</b>
              <span>{m.desc}</span>
            </div>
            {outputs[m.id] && loading !== m.id && <i className="cached" title="Generated" />}
          </button>
        ))}
      </div>

      {mode && (
        <div className="card output fade-in">
          <div className="output-head">
            <Icon name={current?.icon} size={15} style={{ color: 'var(--accent)' }} />
            <b style={{ fontSize: 13 }}>{current?.label}</b>
            {loading === mode && <span className="row muted" style={{ fontSize: 12, gap: 6 }}><i className="dot-pulse" /> Generating…</span>}
            <div className="spacer" />
            {loading === mode ? (
              <button className="btn btn-secondary btn-sm" onClick={stop}><Icon name="stop" size={12} /> Stop</button>
            ) : output ? (
              <>
                <button className={`icon-btn${speaking ? ' active' : ''}`} onClick={speak} title={speaking ? 'Stop reading' : 'Read aloud'} aria-label="Read aloud"><Icon name="volume" /></button>
                <button className="icon-btn" title="Copy" aria-label="Copy" onClick={async () => ((await copyText(output)) ? toast.success('Copied to clipboard') : toast.error('Copy failed'))}><Icon name="copy" /></button>
                <button className="icon-btn" title="Download as Markdown" aria-label="Download" onClick={() => downloadFile(`${slugify(note.title)}-${mode}.md`, `# ${note.title} — ${current?.label}\n\n${output}`)}><Icon name="download" /></button>
                <button className="icon-btn" title="Regenerate" aria-label="Regenerate" onClick={() => run(mode)}><Icon name="refresh" /></button>
              </>
            ) : null}
          </div>
          <div className="output-body">
            {output ? <Markdown streaming={loading === mode}>{output}</Markdown> : (
              loading === mode ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[90, 75, 82, 60].map((w, i) => <div key={i} className="skeleton" style={{ height: 12, width: `${w}%` }} />)}
                </div>
              ) : <p className="muted">Nothing generated yet. <button className="btn btn-ghost btn-sm" onClick={() => run(mode)}>Generate</button></p>
            )}
          </div>
        </div>
      )}

      {!mode && (
        <div className="empty">
          <div className="empty-icon"><Icon name="sparkles" size={24} /></div>
          <h3>Choose a study tool</h3>
          <p>Pick any card above — results stream in live and are kept while you switch tabs.</p>
        </div>
      )}
    </div>
  );
}
