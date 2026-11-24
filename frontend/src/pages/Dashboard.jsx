import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/ui/Icon';
import Confirm from '../components/ui/Confirm';
import Sidebar from '../components/Sidebar';
import Overview from '../components/Overview';
import UploadZone from '../components/UploadZone';
import Generator from '../components/Generator';
import ChatPanel from '../components/ChatPanel';
import Flashcards from '../components/Flashcards';
import MCQQuiz from '../components/MCQQuiz';
import FocusTimer from '../components/FocusTimer';
import CommandPalette from '../components/CommandPalette';
import { fetchNotes, deleteNote, renameNote, errMsg } from '../utils/api';

export const VIEWS = [
  { id: 'overview',   label: 'Overview',   icon: 'home',     needsNote: false },
  { id: 'upload',     label: 'New note',   icon: 'upload',   needsNote: false },
  { id: 'study',      label: 'Study',      icon: 'sparkles', needsNote: true },
  { id: 'chat',       label: 'Chat',       icon: 'chat',     needsNote: true },
  { id: 'flashcards', label: 'Flashcards', icon: 'cards',    needsNote: true },
  { id: 'quiz',       label: 'Quiz',       icon: 'quiz',     needsNote: true },
];

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export default function Dashboard() {
  const { user, logout: signOutUser } = useAuth();
  const navigate = useNavigate();
  const logout = useCallback(async () => { navigate('/'); await signOutUser(); }, [navigate, signOutUser]);
  const { theme, toggle } = useTheme();

  const [notes, setNotes]         = useState([]);
  const [notesLoading, setNL]     = useState(true);
  const [activeId, setActiveId]   = useState(() => store.get('activeNote'));
  const [view, setViewRaw]        = useState(() => {
    const v = store.get('view');
    return VIEWS.some((x) => x.id === v) ? v : 'overview';
  });
  const [visited, setVisited]     = useState(() => new Set([view]));
  const [sidebarOpen, setSidebar] = useState(false);
  const [paletteOpen, setPalette] = useState(false);
  const [pendingDelete, setPD]    = useState(null);
  // Study outputs cached per note + mode so switching tabs/notes never loses them.
  const [outputs, setOutputs]     = useState({});
  const [statsKey, setStatsKey]   = useState(0);

  const activeNote = useMemo(() => notes.find((n) => n._id === activeId) || null, [notes, activeId]);

  const setView = useCallback((v) => {
    setViewRaw(v);
    setVisited((prev) => (prev.has(v) ? prev : new Set(prev).add(v)));
    setSidebar(false);
    store.set('view', v);
    if (v === 'overview') setStatsKey((k) => k + 1);
  }, []);

  const selectNote = useCallback((id, nextView) => {
    setActiveId(id);
    store.set('activeNote', id || '');
    setSidebar(false);
    if (nextView) setView(nextView);
  }, [setView]);

  const loadNotes = useCallback(async () => {
    try {
      const { data } = await fetchNotes();
      const list = data.notes || [];
      setNotes(list);
      setActiveId((cur) => (list.some((n) => n._id === cur) ? cur : list[0]?._id || null));
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load notes'));
    } finally {
      setNL(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // ⌘K / Ctrl+K command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onNoteCreated = (note) => {
    setNotes((prev) => [note, ...prev.filter((n) => n._id !== note._id)]);
    selectNote(note._id, 'study');
    toast.success(`"${note.title}" is ready to study`);
  };

  const onRename = async (id, title) => {
    const prev = notes;
    setNotes((list) => list.map((n) => (n._id === id ? { ...n, title } : n)));
    try {
      await renameNote(id, title);
    } catch (err) {
      setNotes(prev);
      toast.error(errMsg(err, 'Rename failed'));
    }
  };

  const confirmDelete = async () => {
    const note = pendingDelete;
    setPD(null);
    if (!note) return;
    try {
      await deleteNote(note._id);
      const next = notes.filter((n) => n._id !== note._id);
      setNotes(next);
      setOutputs((o) => { const c = { ...o }; delete c[note._id]; return c; });
      if (activeId === note._id) selectNote(next[0]?._id || null);
      toast.success('Note deleted');
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  const setOutput = useCallback((noteId, mode, text) => {
    setOutputs((o) => ({ ...o, [noteId]: { ...(o[noteId] || {}), [mode]: text } }));
  }, []);

  const current = VIEWS.find((v) => v.id === view);

  const renderView = (id) => {
    const needsNote = VIEWS.find((v) => v.id === id)?.needsNote;
    if (needsNote && !activeNote) {
      return (
        <div className="empty fade-in">
          <div className="empty-icon"><Icon name="file" size={24} /></div>
          <h3>{notes.length ? 'Pick a note' : 'Add your first note'}</h3>
          <p>{notes.length ? 'Choose a note from the sidebar to get started.' : 'Upload a PDF or paste text and StudyMind will turn it into study material.'}</p>
          {!notes.length && <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setView('upload')}><Icon name="upload" /> Upload notes</button>}
        </div>
      );
    }
    const key = activeNote?._id || 'none';
    switch (id) {
      case 'overview':   return <Overview refreshKey={statsKey} notes={notes} loading={notesLoading} user={user} onOpen={selectNote} onNavigate={setView} />;
      case 'upload':     return <UploadZone onNoteCreated={onNoteCreated} />;
      case 'study':      return <Generator key={key} note={activeNote} outputs={outputs[key] || {}} setOutput={setOutput} onNavigate={setView} />;
      case 'chat':       return <ChatPanel key={key} note={activeNote} active={view === 'chat'} />;
      case 'flashcards': return <Flashcards key={key} note={activeNote} active={view === 'flashcards'} />;
      case 'quiz':       return <MCQQuiz key={key} note={activeNote} active={view === 'quiz'} />;
      default:           return null;
    }
  };

  return (
    <div className="shell">
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebar(false)} />}
      <Sidebar
        open={sidebarOpen}
        notes={notes}
        loading={notesLoading}
        activeId={activeId}
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onLogout={logout}
        onSelect={(id) => selectNote(id, VIEWS.find((v) => v.id === view)?.needsNote ? view : 'study')}
        onNew={() => setView('upload')}
        onRename={onRename}
        onDelete={(n) => setPD(n)}
      />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebar(true)} aria-label="Open menu">
            <Icon name="menu" size={18} />
          </button>
          <div className="topbar-title truncate">
            <h1 className="truncate">{current?.needsNote && activeNote ? activeNote.title : current?.label}</h1>
            <p className="truncate">
              {current?.needsNote && activeNote
                ? `${activeNote.words?.toLocaleString() || '—'} words · ${activeNote.chunks} sections`
                : 'Your AI study companion'}
            </p>
          </div>
          <div className="spacer" />
          <FocusTimer />
          <button className="cmdk-trigger" onClick={() => setPalette(true)} aria-label="Open command palette">
            <Icon name="search" size={14} />
            <span className="hide-sm">Search…</span>
            <span className="spacer hide-sm" />
            <span className="kbd hide-sm">⌘K</span>
          </button>
        </header>

        <nav className="tabs" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              className={`tab${view === v.id ? ' on' : ''}`}
              onClick={() => setView(v.id)}
            >
              <Icon name={v.icon} size={15} />
              {v.label}
            </button>
          ))}
        </nav>

        <main className="content">
          {VIEWS.filter((v) => visited.has(v.id)).map((v) => (
            <section key={v.id} hidden={view !== v.id} className={view === v.id ? 'fade-in' : undefined}>
              {renderView(v.id)}
            </section>
          ))}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPalette(false)}
        notes={notes}
        views={VIEWS}
        theme={theme}
        onView={setView}
        onNote={(id) => selectNote(id, 'study')}
        onToggleTheme={toggle}
        onLogout={logout}
      />

      <Confirm
        open={Boolean(pendingDelete)}
        title="Delete note?"
        message={`"${pendingDelete?.title}" and its chats, flashcards and quiz history will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={() => setPD(null)}
      />
    </div>
  );
}
