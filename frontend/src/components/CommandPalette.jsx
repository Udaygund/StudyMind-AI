import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './ui/Icon';

export default function CommandPalette({ open, onClose, notes, views, theme, onView, onNote, onToggleTheme, onLogout }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => { if (open) { setQuery(''); setIndex(0); } }, [open]);

  const items = useMemo(() => {
    const all = [
      ...views.map((v) => ({ group: 'Go to', id: `v-${v.id}`, label: v.label, icon: v.icon, run: () => onView(v.id) })),
      ...notes.map((n) => ({ group: 'Notes', id: `n-${n._id}`, label: n.title, icon: 'filetext', run: () => onNote(n._id) })),
      { group: 'Actions', id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, icon: theme === 'dark' ? 'sun' : 'moon', run: onToggleTheme },
      { group: 'Actions', id: 'logout', label: 'Sign out', icon: 'logout', run: onLogout },
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
  }, [query, views, notes, theme, onView, onNote, onToggleTheme, onLogout]);

  useEffect(() => { setIndex(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('.cmdk-item.on')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const run = (item) => { onClose(); item?.run(); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[index]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = null;
  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" size={16} />
          <input autoFocus placeholder="Search notes, views and actions…" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {items.length === 0 && <div className="cmdk-empty">No results for “{query}”</div>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? <div className="cmdk-group label">{item.group}</div> : null;
            lastGroup = item.group;
            return (
              <React.Fragment key={item.id}>
                {header}
                <button className={`cmdk-item${i === index ? ' on' : ''}`}
                  onMouseMove={() => setIndex(i)} onClick={() => run(item)}>
                  <Icon name={item.icon} size={15} />
                  <span className="truncate">{item.label}</span>
                  {i === index && <span className="kbd">↵</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
