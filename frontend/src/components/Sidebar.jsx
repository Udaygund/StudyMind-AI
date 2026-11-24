import React, { useMemo, useState } from 'react';
import Icon from './ui/Icon';
import { timeAgo } from '../utils/helpers';

function NoteRow({ note, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);

  const commit = () => {
    setEditing(false);
    const t = title.trim();
    if (t && t !== note.title) onRename(note._id, t);
    else setTitle(note.title);
  };

  return (
    <div
      className={`note-item${active ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => !editing && onSelect(note._id)}
      onKeyDown={(e) => { if (!editing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(note._id); } }}
      aria-current={active ? 'true' : undefined}
    >
      <div className="note-icon"><Icon name={note.source === 'upload' ? 'filetext' : 'clipboard'} size={15} /></div>
      <div className="note-body">
        {editing ? (
          <input
            className="input note-rename"
            value={title}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setTitle(note.title); setEditing(false); }
            }}
            maxLength={120}
          />
        ) : (
          <>
            <div className="note-title truncate" title={note.title}>{note.title}</div>
            <div className="note-meta">
              {note.words ? `${note.words.toLocaleString()} words` : `${note.chunks} sections`} · {timeAgo(note.updatedAt || note.createdAt)}
            </div>
          </>
        )}
      </div>
      {!editing && (
        <div className="note-actions">
          <button className="icon-btn" aria-label="Rename note" title="Rename"
            onClick={(e) => { e.stopPropagation(); setTitle(note.title); setEditing(true); }}>
            <Icon name="edit" size={13} />
          </button>
          <button className="icon-btn danger" aria-label="Delete note" title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(note); }}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  open, notes, loading, activeId, user, theme,
  onToggleTheme, onLogout, onSelect, onNew, onRename, onDelete,
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? notes.filter((n) => n.title.toLowerCase().includes(q)) : notes;
  }, [notes, query]);

  const name = user?.displayName || user?.email || 'Student';

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Notes">
      <div className="sidebar-head">
        <div className="logo-mark"><Icon name="logo" size={18} /></div>
        <span className="logo-text">Study<em>mind</em></span>
      </div>

      <div className="sidebar-section">
        <button className="btn btn-primary btn-block" onClick={onNew}>
          <Icon name="plus" /> New note
        </button>
        <div className="search">
          <Icon name="search" size={14} />
          <input className="input" placeholder="Search notes" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search notes" />
        </div>
      </div>

      <div className="notes-head">
        <span className="label">Library</span>
        <span className="badge">{notes.length}</span>
      </div>

      <div className="note-list">
        {loading && [0, 1, 2].map((i) => (
          <div key={i} className="note-item"><div className="skeleton" style={{ height: 30, width: 30 }} /><div style={{ flex: 1 }}><div className="skeleton" style={{ height: 10, width: '70%' }} /><div className="skeleton" style={{ height: 8, width: '40%', marginTop: 6 }} /></div></div>
        ))}
        {!loading && notes.length === 0 && (
          <p className="muted" style={{ fontSize: 13, padding: '12px 8px' }}>No notes yet — add one to begin.</p>
        )}
        {!loading && notes.length > 0 && filtered.length === 0 && (
          <p className="muted" style={{ fontSize: 13, padding: '12px 8px' }}>No notes match “{query}”.</p>
        )}
        {filtered.map((n) => (
          <NoteRow key={n._id} note={n} active={n._id === activeId}
            onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="avatar">
          {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
          {user?.email && user?.displayName && <div className="truncate muted" style={{ fontSize: 11 }}>{user.email}</div>}
        </div>
        <button className="icon-btn" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" onClick={onLogout} aria-label="Sign out" title="Sign out">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
