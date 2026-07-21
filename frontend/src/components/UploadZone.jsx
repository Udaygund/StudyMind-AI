import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { uploadNote, indexText } from '../utils/api';

export default function UploadZone({ onNoteCreated }) {
  const [title, setTitle] = useState('');
  const [text, setText]   = useState('');
  const [loading, setLoading] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (title) fd.append('title', title);
      const { data } = await uploadNote(fd);
      onNoteCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const onPaste = async () => {
    if (!text.trim()) return toast.error('Paste some text first');
    setLoading(true);
    try {
      const { data } = await indexText({ title: title || 'Pasted notes', text });
      onNoteCreated(data);
      setText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to index');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        style={s.input}
        placeholder="Note title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <label style={s.drop}>
        <input type="file" accept=".pdf,.txt,.md" onChange={onFile} disabled={loading} hidden />
        <div style={s.dropText}>{loading ? 'Uploading…' : 'Drop PDF, TXT, or MD — or click to browse'}</div>
      </label>
      <div style={s.divider}>or paste text</div>
      <textarea
        style={s.textarea}
        placeholder="Paste lecture notes here…"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={8}
      />
      <button style={s.btn} onClick={onPaste} disabled={loading}>
        Index text
      </button>
    </div>
  );
}

const s = {
  input:    { width: '100%', padding: '10px 14px', background: '#12121a', border: '1px solid #2a2845', borderRadius: 8, color: '#f0effe', marginBottom: 16, fontFamily: "'Syne', sans-serif", boxSizing: 'border-box' },
  drop:     { display: 'block', border: '2px dashed #2a2845', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', marginBottom: 20 },
  dropText: { color: '#9893c8', fontSize: 14 },
  divider:  { textAlign: 'center', color: '#5a5680', fontSize: 11, fontFamily: "'DM Mono', monospace", margin: '16px 0' },
  textarea: { width: '100%', padding: 14, background: '#12121a', border: '1px solid #2a2845', borderRadius: 8, color: '#f0effe', resize: 'vertical', fontFamily: "'DM Mono', monospace", fontSize: 13, boxSizing: 'border-box' },
  btn:      { marginTop: 12, padding: '12px 24px', background: '#7c6dfa', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif" },
};
