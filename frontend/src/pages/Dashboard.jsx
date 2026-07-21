import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import UploadZone from '../components/UploadZone';
import Generator  from '../components/Generator';
import ChatPanel  from '../components/ChatPanel';
import Flashcards from '../components/Flashcards';
import MCQQuiz    from '../components/MCQQuiz';
import { fetchNotes, deleteNote } from '../utils/api';

const TABS = ['📄 Upload', '⚡ Generate', '💬 Chat', '🃏 Flashcards', '🧠 MCQ'];

export default function Dashboard() {
  const { user, logout }       = useAuth();
  const [tab,        setTab]   = useState(0);
  const [notes,      setNotes] = useState([]);
  const [activeNote, setActive]= useState(null);
  const [flashcards, setFCs]   = useState([]);
  const [fcNoteId,   setFCNid] = useState(null);
  const [mcq,        setMCQ]   = useState([]);

  useEffect(() => {
    fetchNotes()
      .then(({ data }) => { setNotes(data.notes); if (data.notes[0]) setActive(data.notes[0]); })
      .catch(() => {});
  }, []);

  const onNoteCreated = (note) => {
    setNotes(prev => [note, ...prev]);
    setActive(note);
    setTab(1);
    toast.success('Note ready — now generate!');
  };

  const onDelete = async (id) => {
    try {
      await deleteNote(id);
      const next = notes.filter(n => n._id !== id);
      setNotes(next);
      if (activeNote?._id === id) setActive(next[0] || null);
      toast.success('Note deleted');
    } catch { toast.error('Delete failed'); }
  };

  const onFlashcards = (cards, noteId) => {
    setFCs(cards); setFCNid(noteId); setTab(3);
  };

  const onMCQ = (questions) => {
    setMCQ(questions); setTab(4);
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>📚</div>
          <div>
            <div style={s.logoText}>StudyMind AI</div>
            <div style={s.logoSub}>RAG-powered · Gemini · MongoDB</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.avatar}>{user?.displayName?.[0] || user?.email?.[0] || '?'}</div>
          <span style={s.userName}>{user?.displayName || user?.email}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <div style={s.layout}>
        <aside style={s.sidebar}>
          <div style={s.sideLabel}>Your Notes</div>
          {notes.length === 0 && (
            <div style={s.noNotes}>No notes yet — upload one</div>
          )}
          {notes.map(n => (
            <div
              key={n._id}
              style={{ ...s.noteItem, ...(activeNote?._id === n._id ? s.noteActive : {}) }}
              onClick={() => { setActive(n); setTab(1); }}
            >
              <div style={s.noteItemTitle}>{n.title}</div>
              <div style={s.noteItemMeta}>{n.chunks} chunks · {n.source}</div>
              <button style={s.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(n._id); }}>✕</button>
            </div>
          ))}
        </aside>

        <main style={s.main}>
          <div style={s.tabs}>
            {TABS.map((t, i) => (
              <button key={i} style={{ ...s.tab, ...(tab === i ? s.tabActive : {}) }} onClick={() => setTab(i)}>
                {t}
              </button>
            ))}
          </div>

          <div style={s.content}>
            {tab === 0 && <UploadZone onNoteCreated={onNoteCreated} />}
            {tab === 1 && (
              <Generator
                note={activeNote}
                onFlashcards={onFlashcards}
                onMCQ={onMCQ}
              />
            )}
            {tab === 2 && <ChatPanel note={activeNote} />}
            {tab === 3 && (
              <Flashcards
                cards={flashcards}
                noteId={fcNoteId}
                onUpdate={setFCs}
              />
            )}
            {tab === 4 && <MCQQuiz questions={mcq} />}
          </div>
        </main>
      </div>
    </div>
  );
}

const s = {
  page:          { minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif", color: '#f0effe' },
  header:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid #2a2845', background: '#0a0a0f', position: 'sticky', top: 0, zIndex: 100 },
  logo:          { display: 'flex', alignItems: 'center', gap: 12 },
  logoIcon:      { width: 36, height: 36, background: 'linear-gradient(135deg,#7c6dfa,#fa6d8f)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  logoText:      { fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' },
  logoSub:       { fontSize: 10, color: '#5a5680', fontFamily: "'DM Mono', monospace", letterSpacing: '.06em' },
  headerRight:   { display: 'flex', alignItems: 'center', gap: 10 },
  avatar:        { width: 30, height: 30, borderRadius: '50%', background: '#7c6dfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  userName:      { fontSize: 13, color: '#9893c8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn:     { padding: '6px 14px', background: 'transparent', border: '1px solid #2a2845', borderRadius: 8, color: '#5a5680', fontSize: 12, cursor: 'pointer', fontFamily: "'Syne', sans-serif" },
  layout:        { display: 'flex', maxWidth: 1200, margin: '0 auto', padding: '24px 20px', gap: 24 },
  sidebar:       { width: 220, flexShrink: 0 },
  sideLabel:     { fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#5a5680', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", marginBottom: 10 },
  noNotes:       { fontSize: 12, color: '#5a5680', fontFamily: "'DM Mono', monospace", padding: '12px 0' },
  noteItem:      { padding: '10px 12px', borderRadius: 10, border: '1px solid transparent', cursor: 'pointer', marginBottom: 4, position: 'relative', transition: 'all .15s' },
  noteActive:    { background: '#12121a', borderColor: '#2a2845' },
  noteItemTitle: { fontSize: 13, fontWeight: 600, color: '#f0effe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 20 },
  noteItemMeta:  { fontSize: 11, color: '#5a5680', fontFamily: "'DM Mono', monospace", marginTop: 3 },
  deleteBtn:     { position: 'absolute', top: 10, right: 8, background: 'transparent', border: 'none', color: '#5a5680', cursor: 'pointer', fontSize: 12, padding: '0 4px' },
  main:          { flex: 1, minWidth: 0 },
  tabs:          { display: 'flex', gap: 4, background: '#12121a', border: '1px solid #2a2845', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab:           { flex: 1, padding: '9px 6px', textAlign: 'center', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', color: '#5a5680', border: 'none', background: 'transparent', letterSpacing: '.01em' },
  tabActive:     { background: '#1a1a26', color: '#f0effe', boxShadow: '0 0 0 1px #2a2845' },
  content:       { background: '#0d0d15', border: '1px solid #2a2845', borderRadius: 14, padding: 24, minHeight: 400 },
};
