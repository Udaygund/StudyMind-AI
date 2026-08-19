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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={s.dropTitle}>{loading ? 'Uploading...' : 'Drop a file or click to browse'}</div>
        <div style={s.dropSub}>PDF, TXT, or Markdown</div>
      </label>
      <div style={s.divider}>
        <span style={s.dividerLine} />
        <span style={s.dividerText}>or paste text</span>
        <span style={s.dividerLine} />
      </div>
      <textarea
        style={s.textarea}
        placeholder="Paste lecture notes here..."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={8}
      />
      <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={onPaste} disabled={loading}>
        Index text
      </button>
    </div>
  );
}

const s = {
  input: {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-0)',
    marginBottom: 12,
    boxSizing: 'border-box',
    fontSize: 13,
    transition: 'border-color 0.15s',
  },
  drop: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px 24px',
    cursor: 'pointer',
    marginBottom: 16,
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropTitle: {
    color: 'var(--text-1)',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 2,
  },
  dropSub: {
    color: 'var(--text-2)',
    fontSize: 12,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '16px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border-subtle)',
  },
  dividerText: {
    color: 'var(--text-2)',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-0)',
    resize: 'vertical',
    fontSize: 13,
    lineHeight: 1.6,
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  btn: {
    marginTop: 12,
    padding: '9px 20px',
    background: 'var(--text-0)',
    color: 'var(--bg-0)',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: 13,
    transition: 'opacity 0.15s',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
