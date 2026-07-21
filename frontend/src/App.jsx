import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" replace />;
};

const Loader = () => (
  <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 13, color: '#5a5680', fontFamily: "'DM Mono', monospace", letterSpacing: '.08em' }}>
      Loading…
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:  '#1a1a26',
              color:       '#f0effe',
              border:      '1px solid #2a2845',
              fontFamily:  "'DM Mono', monospace",
              fontSize:    13,
              borderRadius: 10,
            },
            success: { iconTheme: { primary: '#6dfabd', secondary: '#0a0a0f' } },
            error:   { iconTheme: { primary: '#fa6d8f', secondary: '#0a0a0f' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
