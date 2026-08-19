import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { createChatSession, getChatHistory, streamChatMessage } from '../utils/api';

export default function ChatPanel({ note }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    if (!note?._id) return;
    setSessionId(null);
    setMessages([]);
    createChatSession(note._id)
      .then(({ data }) => {
        setSessionId(data.sessionId);
        return getChatHistory(data.sessionId);
      })
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => toast.error('Could not start chat session'));
  }, [note?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !sessionId || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    let assistant = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChatMessage(
        sessionId,
        userMsg,
        (chunk) => {
          assistant += chunk;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: assistant };
            return next;
          });
        },
        () => setLoading(false),
        (err) => { toast.error(err); setLoading(false); },
        controller.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') { toast.error(err.message); setLoading(false); }
    }
  };

  if (!note) return <p style={s.muted}>Select a note to chat.</p>;

  return (
    <div style={s.wrap}>
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.empty}>Ask anything about "{note.title}"</div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'user' ? s.userRow : s.botRow}>
            {m.role === 'assistant' && (
              <div style={s.avatar}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
                </svg>
              </div>
            )}
            <div style={m.role === 'user' ? s.userBubble : s.botBubble}>
              {m.content || (loading && i === messages.length - 1 ? <span style={s.typing}>...</span> : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={s.inputRow}>
        <input
          style={s.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your notes..."
          disabled={loading || !sessionId}
        />
        <button
          style={{ ...s.send, ...((loading || !sessionId || !input.trim()) ? s.sendDisabled : {}) }}
          onClick={send}
          disabled={loading || !sessionId}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const s = {
  muted: {
    color: 'var(--text-2)',
    fontSize: 13,
  },
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    height: 420,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '4px 0',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-2)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  botRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--text-2)',
    marginTop: 2,
  },
  userBubble: {
    maxWidth: '70%',
    padding: '8px 12px',
    borderRadius: '12px 12px 2px 12px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--text-0)',
    color: 'var(--bg-0)',
  },
  botBubble: {
    maxWidth: '75%',
    padding: '8px 12px',
    borderRadius: '12px 12px 12px 2px',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'var(--bg-2)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-1)',
  },
  typing: {
    opacity: 0.5,
  },
  inputRow: {
    display: 'flex',
    gap: 6,
  },
  input: {
    flex: 1,
    padding: '9px 12px',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-0)',
    fontSize: 13,
    transition: 'border-color 0.15s',
  },
  send: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--text-0)',
    color: 'var(--bg-0)',
    borderRadius: 'var(--radius)',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  sendDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
};
