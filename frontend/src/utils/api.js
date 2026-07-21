import axios from 'axios';
import { auth } from '../firebase';

const API = process.env.REACT_APP_API_URL || '';

const client = axios.create({ baseURL: `${API}/api` });

client.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const syncUser = () => client.post('/auth/sync');
export const fetchNotes = () => client.get('/notes');
export const deleteNote = (id) => client.delete(`/notes/${id}`);
export const uploadNote = (formData) =>
  client.post('/notes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const indexText = (data) => client.post('/notes/text', data);
export const createChatSession = (noteId) => client.post('/chat/session', { noteId });
export const getChatHistory = (sessionId) => client.get(`/chat/history/${sessionId}`);
export const generateFlashcards = (noteId, count = 8) =>
  client.post('/generate/flashcards', { noteId, count });
export const generateMCQ = (noteId, count = 5) =>
  client.post('/generate/mcq', { noteId, count });
export const toggleFlashcardLearned = (noteId, cardIndex, learned) =>
  client.patch(`/generate/flashcards/${noteId}/learned`, { cardIndex, learned });

export const streamSSE = async (path, body, onChunk, onDone, onError) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();

  const res = await fetch(`${API}/api${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) onError?.(data.error);
        else if (data.done) onDone?.();
        else if (data.text) onChunk?.(data.text);
      } catch {
        /* skip malformed */
      }
    }
  }
};

export const streamChatMessage = (sessionId, message, onChunk, onDone, onError) =>
  streamSSE('/chat/message', { sessionId, message }, onChunk, onDone, onError);

export default client;
