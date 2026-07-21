import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { streamSSE, generateFlashcards, generateMCQ } from '../utils/api';

export default function Generator({ note, onFlashcards, onMCQ }) {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);

  if (!note) {
    return <p style={s.muted}>Select or upload a note first.</p>;
  }

  const stream = async (path, label) => {
    setLoading(true);
    setMode(label);
    setOutput('');
    try {
      await streamSSE(
        path,
        { noteId: note._id },
        (chunk) => setOutput(prev => prev + chunk),
        () => setLoading(false),
        (err) => { toast.error(err); setLoading(false); }
      );
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  const flashcards = async () => {
    setLoading(true);
    setMode('flashcards');
    try {
      const { data } = await generateFlashcards(note._id);
      onFlashcards(data.flashcards, note._id);
      toast.success('Flashcards ready');
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
      toast.success('Quiz ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={s.note}>Generating from: <strong>{note.title}</strong></p>
      <div style={s.actions}>
        <button style={s.btn} disabled={loading} onClick={() => stream('/generate/summary', 'summary')}>Summary</button>
        <button style={s.btn} disabled={loading} onClick={() => stream('/generate/concepts', 'concepts')}>Concepts</button>
        <button style={s.btn} disabled={loading} onClick={flashcards}>Flashcards</button>
        <button style={s.btn} disabled={loading} onClick={mcq}>MCQ Quiz</button>
      </div>
      {loading && mode && mode !== 'flashcards' && mode !== 'mcq' && (
        <p style={s.muted}>Streaming {mode}…</p>
      )}
      {output && (
        <pre style={s.output}>{output}</pre>
      )}
    </div>
  );
}

const s = {
  muted:   { color: '#5a5680', fontFamily: "'DM Mono', monospace", fontSize: 13 },
  note:    { color: '#9893c8', marginBottom: 16, fontSize: 14 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  btn:     { padding: '10px 16px', background: '#1a1a26', border: '1px solid #2a2845', borderRadius: 8, color: '#f0effe', cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13 },
  output:  { background: '#12121a', border: '1px solid #2a2845', borderRadius: 10, padding: 16, whiteSpace: 'pre-wrap', fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#c8c4f0', maxHeight: 400, overflow: 'auto' },
};
