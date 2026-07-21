import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { createChatSession, getChatHistory, streamChatMessage } from '../utils/api';

export default function ChatPanel({ note }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
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
        (err) => { toast.error(err); setLoading(false); }
      );
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  if (!note) return <p style={s.muted}>Select a note to chat.</p>;

  return (
    <div style={s.wrap}>
      <div style={s.messages}>
        {messages.map((m, i) => (
          <div key={i} style={{ ...s.bubble, ...(m.role === 'user' ? s.user : s.bot) }}>
            {m.content || (loading && i === messages.length - 1 ? '…' : '')}
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
          placeholder="Ask about your notes…"
          disabled={loading || !sessionId}
        />
        <button style={s.send} onClick={send} disabled={loading || !sessionId}>Send</button>
      </div>
    </div>
  );
}

const s = {
  muted:    { color: '#5a5680', fontFamily: "'DM Mono', monospace" },
  wrap:     { display: 'flex', flexDirection: 'column', height: 360 },
  messages: { flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  bubble:   { maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, fontFamily: "'DM Mono', monospace" },
  user:     { alignSelf: 'flex-end', background: '#7c6dfa', color: '#fff' },
  bot:      { alignSelf: 'flex-start', background: '#12121a', border: '1px solid #2a2845', color: '#c8c4f0' },
  inputRow: { display: 'flex', gap: 8 },
  input:    { flex: 1, padding: '10px 14px', background: '#12121a', border: '1px solid #2a2845', borderRadius: 8, color: '#f0effe' },
  send:     { padding: '10px 20px', background: '#7c6dfa', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' },
};
