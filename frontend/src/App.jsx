import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { firebaseReady, missingFirebaseEnv } from './firebase';
import Icon from './components/ui/Icon';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const Loader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-3)' }}>
    <div className="logo-mark"><Icon name="logo" size={18} /></div>
    <span className="spinner" />
  </div>
);

const SetupScreen = () => (
  <div className="setup-screen">
    <div className="card">
      <div className="logo-mark" style={{ marginBottom: 14 }}><Icon name="logo" size={18} /></div>
      <h2 style={{ fontSize: 18, marginBottom: 6 }}>Firebase isn't configured</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Copy <code>frontend/.env.example</code> to <code>frontend/.env</code>, fill in these values, then restart <code>npm start</code>:
      </p>
      <ul style={{ paddingLeft: 18, fontSize: 13, display: 'grid', gap: 4 }}>
        {missingFirebaseEnv.map((k) => <li key={k}><code>{k}</code></li>)}
      </ul>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  if (!firebaseReady) {
    return <ThemeProvider><SetupScreen /></ThemeProvider>;
  }
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background:   'var(--bg-elev)',
                color:        'var(--text)',
                border:       '1px solid var(--border)',
                fontSize:     13,
                borderRadius: 12,
                boxShadow:    'var(--shadow)',
              },
              success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-elev)' } },
              error:   { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-elev)' }, duration: 5000 },
            }}
          />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
