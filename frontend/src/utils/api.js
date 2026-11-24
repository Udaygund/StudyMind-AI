import axios from 'axios';
import { auth } from '../firebase';

const API = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const client = axios.create({ baseURL: `${API}/api`, timeout: 120000 });

client.interceptors.request.use(async (config) => {
  const user = auth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Human-readable message from an axios / fetch error. */
export const errMsg = (err, fallback = 'Something went wrong') => {
  if (!err) return fallback;
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'Request timed out — try again';
  if (err.message === 'Network Error') return 'Cannot reach the server — is the backend running?';
  return err.message || fallback;
};

// ── Auth ──
export const syncUser = () => client.post('/auth/sync');
export const requestLoginCode = (email) => client.post('/auth/otp/request', { email });
export const verifyLoginCode  = (email, code) => client.post('/auth/otp/verify', { email, code });

// ── Notes ──
export const fetchNotes  = () => client.get('/notes');
export const fetchNote   = (id) => client.get(`/notes/${id}`);
export const deleteNote  = (id) => client.delete(`/notes/${id}`);
export const renameNote  = (id, title) => client.patch(`/notes/${id}`, { title });
export const uploadNote  = (formData, onUploadProgress) =>
  client.post('/notes/upload', formData, { onUploadProgress });
export const indexText   = (data) => client.post('/notes/text', data);

// ── Chat ──
export const createChatSession = (noteId) => client.post('/chat/session', { noteId });
export const listChatSessions  = (noteId) => client.get(`/chat/sessions/${noteId}`);
export const getChatHistory    = (sessionId) => client.get(`/chat/history/${sessionId}`);
export const deleteChatSession = (sessionId) => client.delete(`/chat/session/${sessionId}`);
export const suggestQuestions  = (noteId) => client.post('/chat/suggest', { noteId });

// ── Generate ──
export const generateFlashcards = (noteId, count = 10, difficulty = 'medium') =>
  client.post('/generate/flashcards', { noteId, count, difficulty });
export const getFlashcards = (noteId) => client.get(`/generate/flashcards/${noteId}`);
export const toggleFlashcardLearned = (noteId, cardIndex, learned) =>
  client.patch(`/generate/flashcards/${noteId}/learned`, { cardIndex, learned });
export const generateMCQ = (noteId, count = 5, difficulty = 'medium') =>
  client.post('/generate/mcq', { noteId, count, difficulty });
export const saveQuizAttempt = (data) => client.post('/generate/mcq/attempt', data);
export const getQuizAttempts = (noteId) => client.get(`/generate/mcq/attempts/${noteId}`);

// ── Stats ──
export const fetchStats = () => client.get('/stats');

/**
 * POST to an SSE endpoint and stream `{text}` events.
 * Resolves when the stream finishes; rejects on HTTP / stream errors.
 * Abort via `signal` — rejects with an AbortError the caller can ignore.
 */
export const streamSSE = async (path, body, { onChunk, signal } = {}) => {
  const user = auth?.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();

  let res;
  try {
    res = await fetch(`${API}/api${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Cannot reach the server — is the backend running?');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  if (!res.body) return;

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handle = (line) => {
    if (!line.startsWith('data:')) return false;
    let data;
    try { data = JSON.parse(line.slice(5).trim()); } catch { return false; }
    if (data.error) throw new Error(data.error);
    if (data.text) onChunk?.(data.text);
    return Boolean(data.done);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (handle(line.trim())) return;
      }
    }
    if (buffer.trim()) handle(buffer.trim());
  } finally {
    reader.releaseLock?.();
  }
};

export const streamChatMessage = (sessionId, message, opts) =>
  streamSSE('/chat/message', { sessionId, message }, opts);

export default client;
