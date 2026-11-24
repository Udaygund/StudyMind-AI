import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './ui/Icon';
import Markdown from './ui/Markdown';
import {
  createChatSession, listChatSessions, getChatHistory, deleteChatSession,
  suggestQuestions, streamChatMessage, errMsg,
} from '../utils/api';
import { copyText, timeAgo } from '../utils/helpers';

// Suggestions cost an AI call — cache them per note for the page lifetime.
const suggestionCache = new Map();
const FALLBACK = ['Summarize the main idea in 3 bullets', 'What are the key terms I should know?', 'Give me a tricky exam question', 'What is most likely to be tested?'];

export default function ChatPanel({ note, active }) {
  const [sessions, setSessions]   = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingHist, setLH]      = useState(true);
  const [suggestions, setSugg]    = useState(() => suggestionCache.get(note._id) || null);
  const abortRef    = useRef(null);
  const scrollRef   = useRef(null);
  const inputRef    = useRef(null);
  const stickBottom = useRef(true);
  const loadToken   = useRef(0);
  const openSid     = useRef(null);

  const openSession = useCallback(async (sid) => {
    abortRef.current?.abort();
    const token = ++loadToken.current;
    openSid.current = sid;
    setSessionId(sid);
    setLH(true);
    try {
      const { data } = sid ? await getChatHistory(sid) : { data: { messages: [] } };
      if (token === loadToken.current) setMessages(data.messages || []);
    } catch (err) {
      if (token === loadToken.current) { setMessages([]); toast.error(errMsg(err, 'Could not load chat')); }
    } finally {
      if (token === loadToken.current) setLH(false);
    }
  }, []);

  // Load sessions for this note and resume the most recent one.
  useEffect(() => {
    let alive = true;
    listChatSessions(note._id)
      .then(({ data }) => {
        if (!alive) return;
        const list = (data.sessions || []).filter((s) => s.messageCount > 0);
        setSessions(list);
        openSession(list[0]?.sessionId || null);
      })
      .catch((err) => { if (alive) { setLH(false); toast.error(errMsg(err, 'Could not load chats')); } });
    return () => { alive = false; abortRef.current?.abort(); };
  }, [note._id, openSession]);

  // Fetch starter suggestions once per note, only when the chat is visible and empty.
  useEffect(() => {
    if (!active || suggestions || loadingHist || messages.length) return;
    let alive = true;
    suggestQuestions(note._id)
      .then(({ data }) => {
        const q = data.questions?.length ? data.questions : FALLBACK;
        suggestionCache.set(note._id, q);
        if (alive) setSugg(q);
      })
      .catch(() => alive && setSugg(FALLBACK));
    return () => { alive = false; };
  }, [active, suggestions, loadingHist, messages.length, note._id]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => { if (active) inputRef.current?.focus(); }, [active, sessionId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput('');
    requestAnimationFrame(() => autoGrow(inputRef.current));
    stickBottom.current = true;

    let sid = sessionId;
    if (!sid) {
      try {
        const { data } = await createChatSession(note._id);
        sid = data.sessionId;
        openSid.current = sid;
        setSessionId(sid);
      } catch (err) {
        setInput(msg);
        return toast.error(errMsg(err, 'Could not start chat'));
      }
    }

    setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let answer = '';
    const update = (content, extra = {}) => setMessages((prev) => {
      // Guard: the user may have switched conversations mid-stream.
      if (openSid.current !== sid || prev[prev.length - 1]?.role !== 'assistant') return prev;
      const next = [...prev];
      next[next.length - 1] = { role: 'assistant', content, ...extra };
      return next;
    });

    try {
      await streamChatMessage(sid, msg, {
        signal: controller.signal,
        onChunk: (chunk) => { answer += chunk; update(answer); },
      });
      if (!answer) update('_No response — please try again._', { error: true });
    } catch (err) {
      if (err.name === 'AbortError') {
        update(answer ? `${answer}\n\n_— stopped_` : '_Stopped._');
      } else {
        update(answer || `⚠️ ${err.message}`, { error: !answer });
        toast.error(err.message);
      }
    } finally {
      if (abortRef.current === controller) {
        setStreaming(false);
        abortRef.current = null;
      }
      setSessions((prev) => {
        const title = prev.find((s) => s.sessionId === sid)?.title || (msg.length > 60 ? `${msg.slice(0, 57)}…` : msg);
        return [{ sessionId: sid, title, updatedAt: new Date().toISOString(), messageCount: 1 }, ...prev.filter((s) => s.sessionId !== sid)];
      });
    }
  };

  const newChat = () => {
    if (streaming) abortRef.current?.abort();
    openSession(null);
  };

  const removeSession = async (sid) => {
    try {
      await deleteChatSession(sid);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sid));
      if (sid === sessionId) openSession(null);
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat">
      <div className="chat-sessions">
        <button className="btn btn-secondary btn-block" onClick={newChat} style={{ marginBottom: 8 }}>
          <Icon name="plus" size={14} /> New chat
        </button>
        <span className="label" style={{ padding: '6px 10px' }}>History</span>
        {sessions.length === 0 && <p className="muted" style={{ fontSize: 12, padding: '4px 10px' }}>No conversations yet.</p>}
        {sessions.map((s) => (
          <div key={s.sessionId} className={`session${s.sessionId === sessionId ? ' on' : ''}`}
            role="button" tabIndex={0}
            onClick={() => s.sessionId !== sessionId && openSession(s.sessionId)}
            onKeyDown={(e) => e.key === 'Enter' && openSession(s.sessionId)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate">{s.title || 'Chat'}</div>
              <div className="muted" style={{ fontSize: 11 }}>{timeAgo(s.updatedAt)}</div>
            </div>
            <button className="icon-btn danger" aria-label="Delete chat"
              onClick={(e) => { e.stopPropagation(); removeSession(s.sessionId); }}>
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="card chat-main">
        <div className="messages" ref={scrollRef} onScroll={onScroll} aria-live="polite">
          {loadingHist ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="skeleton" style={{ height: 40, width: '45%', justifySelf: 'end' }} />
              <div className="skeleton" style={{ height: 80, width: '70%' }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-welcome fade-in">
              <div className="empty-icon" style={{ margin: '0 auto' }}><Icon name="bot" size={24} /></div>
              <h3>Ask your notes anything</h3>
              <p className="muted" style={{ fontSize: 13 }}>Answers come from “{note.title}”, so they stay accurate to what you're studying.</p>
              <div className="chips">
                {(suggestions || [0, 1, 2, 3]).map((q, i) => (
                  typeof q === 'string'
                    ? <button key={i} className="chip" onClick={() => send(q)}>{q}</button>
                    : <div key={i} className="skeleton" style={{ height: 40 }} />
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              if (m.role === 'user') {
                return <div key={i} className="msg user"><div className="bubble">{m.content}</div></div>;
              }
              return (
                <div key={i} className="msg bot">
                  <div className="msg-avatar"><Icon name="logo" size={15} /></div>
                  <div style={{ minWidth: 0, maxWidth: '100%' }}>
                    <div className="bubble" style={m.error ? { borderColor: 'var(--red)' } : undefined}>
                      {m.content
                        ? <Markdown streaming={streaming && isLast}>{m.content}</Markdown>
                        : <span className="typing"><i /><i /><i /></span>}
                    </div>
                    {m.content && !(streaming && isLast) && (
                      <div className="msg-tools">
                        <button className="icon-btn" title="Copy" aria-label="Copy answer"
                          onClick={async () => ((await copyText(m.content)) ? toast.success('Copied') : toast.error('Copy failed'))}>
                          <Icon name="copy" size={13} />
                        </button>
                        {isLast && i > 0 && (
                          <button className="icon-btn" title="Ask again" aria-label="Ask again"
                            onClick={() => { const q = messages[i - 1]?.content; setMessages((p) => p.slice(0, -2)); send(q); }}>
                            <Icon name="refresh" size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="composer">
          <div className="composer-box">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder={`Ask about “${note.title}”…`}
              onChange={(e) => { setInput(e.target.value); autoGrow(e.target); }}
              onKeyDown={onKeyDown}
              maxLength={4000}
              aria-label="Message"
            />
            {streaming ? (
              <button className="btn btn-secondary" style={{ height: 36, width: 36, padding: 0 }} onClick={() => abortRef.current?.abort()} aria-label="Stop generating">
                <Icon name="stop" size={13} />
              </button>
            ) : (
              <button className="btn btn-primary" style={{ height: 36, width: 36, padding: 0 }} onClick={() => send()} disabled={!input.trim() || loadingHist} aria-label="Send">
                <Icon name="send" size={15} />
              </button>
            )}
          </div>
          <div className="composer-hint">
            <span><span className="kbd">↵</span> send · <span className="kbd">⇧</span>+<span className="kbd">↵</span> new line</span>
            <span>Grounded in your notes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
