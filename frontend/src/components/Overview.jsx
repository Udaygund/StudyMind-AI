import React, { useEffect, useState } from 'react';
import Icon from './ui/Icon';
import { fetchStats } from '../utils/api';
import { timeAgo } from '../utils/helpers';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function Stat({ icon, color, label, value, sub }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Ring({ pct }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="progress-ring">
      <svg width="120" height="120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }} />
      </svg>
      <div className="ring-label"><b>{pct}%</b><span className="muted" style={{ fontSize: 11 }}>mastered</span></div>
    </div>
  );
}

export default function Overview({ refreshKey, notes, loading, user, onOpen, onNavigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchStats().then(({ data }) => alive && setStats(data)).catch(() => alive && setStats(false));
    return () => { alive = false; };
  }, [refreshKey]);

  const first = (user?.displayName || '').split(' ')[0];
  const mastery = stats?.totalCards ? Math.round((stats.learnedCards / stats.totalCards) * 100) : 0;
  const noteTitle = (id) => notes.find((n) => n._id === id)?.title || 'Deleted note';

  return (
    <div>
      <div className="hero">
        <h2>{greeting()}{first ? <>, <em style={{ fontStyle: 'italic' }}>{first}</em></> : ''}.</h2>
        <p>
          {stats?.streak
            ? <>You're on a <span className="mark">{stats.streak}-day streak</span>. Don't break the chain.</>
            : 'Turn any notes into summaries, flashcards, quizzes and a personal AI tutor.'}
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => onNavigate('upload')}><Icon name="upload" /> Add notes</button>
          {notes.length > 0 && <button className="btn btn-secondary" onClick={() => onNavigate('flashcards')}><Icon name="cards" /> Review flashcards</button>}
          {notes.length > 0 && <button className="btn btn-secondary" onClick={() => onNavigate('quiz')}><Icon name="quiz" /> Take a quiz</button>}
        </div>
      </div>

      <div className="stats">
        {stats === null ? [0, 1, 2, 3].map((i) => (
          <div key={i} className="card stat"><div className="skeleton" style={{ height: 12, width: '50%' }} /><div className="skeleton" style={{ height: 28, width: '40%', marginTop: 12 }} /></div>
        )) : (
          <>
            <Stat icon="flame"   color="amber"  label="Study streak" value={stats ? `${stats.streak}d` : '—'} sub="consecutive days" />
            <Stat icon="book"    color="accent" label="Notes"        value={stats ? stats.notes : notes.length} sub={`${stats?.chats || 0} chats started`} />
            <Stat icon="cards"   color="green"  label="Cards learned" value={stats ? `${stats.learnedCards}/${stats.totalCards}` : '—'} sub="across all decks" />
            <Stat icon="target"  color="red"    label="Quiz average" value={stats?.avgQuiz != null ? `${stats.avgQuiz}%` : '—'} sub={`${stats?.quizzesTaken || 0} quizzes taken`} />
          </>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="card panel">
          <div className="panel-head">
            <h3>Last 14 days</h3>
            <span className="badge accent"><Icon name="flame" size={12} /> {stats?.streak || 0} day streak</span>
          </div>
          <div className="heat">
            {(stats?.activity || Array.from({ length: 14 }, (_, i) => ({ date: String(i), active: false }))).map((d) => (
              <div key={d.date} className={`heat-cell${d.active ? ' on' : ''}`}
                title={`${d.date}${d.active ? ' — studied' : ''}`} />
            ))}
          </div>
          <div className="heat-labels"><span>2 weeks ago</span><span>Today</span></div>
        </div>
        <div className="card panel" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Ring pct={mastery} />
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Flashcard mastery</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {stats?.totalCards
                ? `${stats.totalCards - stats.learnedCards} cards left to master.`
                : 'Generate a deck to start tracking mastery.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card panel">
          <div className="panel-head"><h3>Recent notes</h3><span className="muted" style={{ fontSize: 12 }}>{notes.length} total</span></div>
          {loading ? <div className="skeleton" style={{ height: 80 }} /> : notes.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Nothing here yet. Upload a PDF or paste some notes to begin.</p>
          ) : (
            <div className="list">
              {notes.slice(0, 5).map((n) => (
                <button key={n._id} className="list-row" style={{ textAlign: 'left', width: '100%' }} onClick={() => onOpen(n._id, 'study')}>
                  <Icon name="filetext" size={15} style={{ color: 'var(--text-3)' }} />
                  <span className="truncate" style={{ flex: 1 }}>{n.title}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{timeAgo(n.updatedAt || n.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="card panel">
          <div className="panel-head"><h3>Recent quizzes</h3></div>
          {!stats?.recentQuizzes?.length ? (
            <p className="muted" style={{ fontSize: 13 }}>Your quiz results will appear here.</p>
          ) : (
            <div className="list">
              {stats.recentQuizzes.slice(0, 5).map((q, i) => {
                const pct = Math.round((q.score / q.total) * 100);
                return (
                  <div key={i} className="list-row">
                    <span className={`badge ${pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'}`}>{pct}%</span>
                    <span className="truncate" style={{ flex: 1 }}>{noteTitle(String(q.noteId))}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{timeAgo(q.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
