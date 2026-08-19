import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { streamSSE, generateFlashcards, generateMCQ } from '../utils/api';

export default function Generator({ note, onFlashcards, onMCQ }) {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);
  const abortRef = useRef(null);

  if (!note) {
    return <p style={s.muted}>Select a note to get started.</p>;
  }

  const stream = async (path, label) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setMode(label);
    setOutput('');
    try {
      await streamSSE(
        path,
        { noteId: note._id },
        (chunk) => setOutput(prev => prev + chunk),
        () => setLoading(false),
        (err) => { toast.error(err); setLoading(false); },
        controller.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') { toast.error(err.message); setLoading(false); }
    }
  };

  const flashcards = async () => {
    setLoading(true);
    setMode('flashcards');
    try {
      const { data } = await generateFlashcards(note._id);
      onFlashcards(data.flashcards, note._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const mcq = async () => {
    setLoading(true);
    setMode('mcq');
    try {
      const { data } = await generateMCQ(note._id);
      onMCQ(data.questions);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={s.context}>
        <span style={s.contextLabel}>Source</span>
        <span style={s.contextTitle}>{note.title}</span>
      </div>
      <div style={s.actions}>
        <button style={s.btn} disabled={loading} onClick={() => stream('/generate/summary', 'summary')}>Summary</button>
        <button style={s.btn} disabled={loading} onClick={() => stream('/generate/concepts', 'concepts')}>Key Concepts</button>
        <button style={s.btn} disabled={loading} onClick={flashcards}>Flashcards</button>
        <button style={s.btn} disabled={loading} onClick={mcq}>Quiz</button>
      </div>
      {loading && mode && mode !== 'flashcards' && mode !== 'mcq' && (
        <div style={s.streaming}>
          <span style={s.dot} />
          Generating {mode}...
        </div>
      )}
      {output && (
        <div style={s.output}>{output}</div>
      )}
    </div>
  );
}

const s = {
  muted: {
    color: 'var(--text-2)',
    fontSize: 13,
  },
  context: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: '8px 12px',
    background: 'var(--bg-2)',
    borderRadius: 'var(--radius)',
  },
  contextLabel: {
    fontSize: 11,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  contextTitle: {
    fontSize: 13,
    color: 'var(--text-0)',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  btn: {
    padding: '7px 14px',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-1)',
    fontWeight: 500,
    fontSize: 13,
    transition: 'border-color 0.15s, color 0.15s',
  },
  streaming: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--text-2)',
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  output: {
    padding: 16,
    background: 'var(--bg-2)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius)',
    whiteSpace: 'pre-wrap',
    fontSize: 13,
    lineHeight: 1.7,
    color: 'var(--text-1)',
    maxHeight: 400,
    overflow: 'auto',
  },
};
