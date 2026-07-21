import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, loading, login } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>📚</div>
        <h1 style={s.title}>StudyMind AI</h1>
        <p style={s.sub}>Upload notes · Generate summaries · Chat with RAG</p>
        <button style={s.btn} onClick={login}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

const s = {
  page:  { minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" },
  card:  { background: '#12121a', border: '1px solid #2a2845', borderRadius: 16, padding: 48, textAlign: 'center', maxWidth: 380, width: '90%' },
  icon:  { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#f0effe', margin: '0 0 8px' },
  sub:   { fontSize: 13, color: '#5a5680', fontFamily: "'DM Mono', monospace", marginBottom: 32 },
  btn:   { width: '100%', padding: '14px 24px', background: 'linear-gradient(135deg,#7c6dfa,#fa6d8f)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif" },
};
