import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UploadZone from '../components/UploadZone';
import Generator  from '../components/Generator';
import ChatPanel  from '../components/ChatPanel';
import Flashcards from '../components/Flashcards';
import MCQQuiz    from '../components/MCQQuiz';
import { fetchNotes, deleteNote } from '../utils/api';

const TABS = ['Upload', 'Generate', 'Chat', 'Flashcards', 'Quiz'];

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function Dashboard() {
  const { user, logout }       = useAuth();
  const { theme, toggle }      = useTheme();
  const [tab,        setTab]   = useState(0);
  const [notes,      setNotes] = useState([]);
  const [activeNote, setActive]= useState(null);
  const [flashcards, setFCs]   = useState([]);
  const [fcNoteId,   setFCNid] = useState(null);
  const [mcq,        setMCQ]   = useState([]);

  useEffect(() => {
    fetchNotes()
      .then(({ data }) => {
        const list = data.notes || [];
        setNotes(list);
        if (list[0]) setActive(list[0]);
      })
      .catch((err) => { console.error('Failed to fetch notes:', err); });
  }, []);

  const onNoteCreated = (note) => {
    setNotes(prev => [note, ...prev]);
    setActive(note);
    setTab(1);
    toast.success('Note indexed');
  };

  useEffect(() => {
    setFCs([]); setFCNid(null); setMCQ([]);
  }, [activeNote?._id]);

  const onDelete = async (id) => {
    try {
      await deleteNote(id);
      const next = notes.filter(n => n._id !== id);
      setNotes(next);
      if (activeNote?._id === id) setActive(next[0] || null);
      toast.success('Deleted');
    } catch (err) { console.error('Delete failed:', err); toast.error('Delete failed'); }
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          <span style={s.logoText}>StudyMind</span>
        </div>
        <div style={s.headerRight}>
          <button
            style={s.themeBtn}
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <span style={s.userName}>{user?.displayName || user?.email}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <div style={s.layout}>
        <aside style={s.sidebar}>
          <div style={s.sideHeader}>
            <span style={s.sideLabel}>Notes</span>
            <span style={s.noteCount}>{notes.length}</span>
          </div>
          <div style={s.noteList}>
            {notes.length === 0 && (
              <div style={s.noNotes}>No notes yet</div>
            )}
            {notes.map(n => (
              <div
                key={n._id}
                style={{ ...s.noteItem, ...(activeNote?._id === n._id ? s.noteActive : {}) }}
                onClick={() => { setActive(n); setTab(1); }}
              >
                <div style={s.noteItemTitle}>{n.title}</div>
                <div style={s.noteItemMeta}>{n.chunks} chunks</div>
                <button
                  style={s.deleteBtn}
                  onClick={e => { e.stopPropagation(); onDelete(n._id); }}
                  aria-label="Delete note"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main style={s.main}>
          <div style={s.tabs}>
            {TABS.map((t, i) => (
              <button
                key={t}
                style={{ ...s.tab, ...(tab === i ? s.tabActive : {}) }}
                onClick={() => setTab(i)}
              >
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
  page: {
    minHeight: '100vh',
    background: 'var(--bg-0)',
    color: 'var(--text-0)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 48,
    borderBottom: '1px solid var(--border-subtle)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'var(--header-bg)',
    backdropFilter: 'blur(12px)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-0)',
    letterSpacing: '-0.01em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  themeBtn: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius)',
    color: 'var(--text-2)',
    border: '1px solid var(--border-subtle)',
    background: 'transparent',
    transition: 'color 0.15s, border-color 0.15s',
  },
  userName: {
    fontSize: 13,
    color: 'var(--text-2)',
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    padding: '5px 12px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-2)',
    fontSize: 12,
    fontWeight: 500,
    transition: 'border-color 0.15s, color 0.15s',
  },
  layout: {
    display: 'flex',
    maxWidth: 1120,
    margin: '0 auto',
    padding: '20px 24px',
    gap: 32,
    minHeight: 'calc(100vh - 48px)',
  },
  sidebar: {
    width: 200,
    flexShrink: 0,
  },
  sideHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: '0 4px',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  noteCount: {
    fontSize: 11,
    color: 'var(--text-2)',
    background: 'var(--bg-3)',
    padding: '1px 6px',
    borderRadius: 4,
  },
  noteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  noNotes: {
    fontSize: 13,
    color: 'var(--text-2)',
    padding: '16px 4px',
  },
  noteItem: {
    padding: '8px 10px',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.12s',
  },
  noteActive: {
    background: 'var(--bg-2)',
  },
  noteItemTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-0)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 24,
  },
  noteItemMeta: {
    fontSize: 11,
    color: 'var(--text-2)',
    marginTop: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-2)',
    padding: 4,
    borderRadius: 4,
    opacity: 0,
    transition: 'opacity 0.12s, color 0.12s',
    display: 'flex',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  tabs: {
    display: 'flex',
    gap: 2,
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: 24,
  },
  tab: {
    padding: '8px 14px',
    borderRadius: 'var(--radius) var(--radius) 0 0',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-2)',
    background: 'transparent',
    transition: 'color 0.12s, background 0.12s',
    position: 'relative',
  },
  tabActive: {
    color: 'var(--text-0)',
    background: 'var(--bg-2)',
  },
  content: {
    minHeight: 400,
  },
};
