import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './ui/Icon';
import { uploadNote, indexText, errMsg } from '../utils/api';

const MAX_MB = 15;
const ACCEPT = /\.(pdf|txt|md|markdown)$/i;

export default function UploadZone({ onNoteCreated }) {
  const [title, setTitle]     = useState('');
  const [text, setText]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [drag, setDrag]       = useState(false);
  const [progress, setProg]   = useState(0);
  const inputRef = useRef(null);
  const dragDepth = useRef(0);

  const uploadFile = async (file) => {
    if (!file) return;
    if (!ACCEPT.test(file.name)) return toast.error('Only PDF, TXT or Markdown files are supported');
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`File too large (max ${MAX_MB} MB)`);
    setBusy(true);
    setProg(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (title.trim()) fd.append('title', title.trim());
      const { data } = await uploadNote(fd, (e) => e.total && setProg(Math.round((e.loaded / e.total) * 100)));
      setTitle('');
      onNoteCreated(data);
    } catch (err) {
      toast.error(errMsg(err, 'Upload failed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDrag(false);
    if (busy) return;
    uploadFile(e.dataTransfer.files?.[0]);
  };

  const onPaste = async () => {
    if (!text.trim()) return toast.error('Paste some text first');
    if (text.trim().length < 50) return toast.error('Add a bit more text (at least 50 characters)');
    setBusy(true);
    try {
      const { data } = await indexText({ title: title.trim() || 'Pasted notes', text });
      setText('');
      setTitle('');
      onNoteCreated(data);
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save notes'));
    } finally {
      setBusy(false);
    }
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="section-head">
        <div>
          <h2>Add study material</h2>
          <p>Upload lecture slides, a textbook chapter or paste your notes — we'll index them for AI study tools.</p>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="note-title">Title <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
        <input id="note-title" className="input" placeholder="e.g. Biology — Chapter 4: Cell respiration"
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </div>

      <div
        className={`dropzone${drag ? ' drag' : ''}${busy ? ' busy' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDrag(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDrag(false); }}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept=".pdf,.txt,.md,.markdown" hidden
          onChange={(e) => uploadFile(e.target.files?.[0])} />
        <div className="dropzone-icon">{busy ? <span className="spinner" /> : <Icon name="upload" size={24} />}</div>
        <h3>{busy ? (progress < 100 ? `Uploading… ${progress}%` : 'Extracting & indexing…') : drag ? 'Drop to upload' : 'Drag & drop a file, or click to browse'}</h3>
        <p>PDF, TXT or Markdown · up to {MAX_MB} MB</p>
      </div>

      <div className="divider">or paste text</div>

      <textarea className="textarea" rows={10} placeholder="Paste lecture notes, an article, or anything you want to learn…"
        value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
      <div className="field-foot">
        <span className="muted" style={{ fontSize: 12 }}>{words.toLocaleString()} words</span>
        <button className="btn btn-primary" onClick={onPaste} disabled={busy || !text.trim()}>
          {busy ? <span className="spinner" /> : <Icon name="sparkles" />} Save & index
        </button>
      </div>
    </div>
  );
}
