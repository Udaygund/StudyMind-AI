import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';

const Loader = () => (
  <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
      Loading...
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background:  'var(--bg-2)',
                color:       'var(--text-0)',
                border:      '1px solid var(--border)',
                fontSize:    13,
                borderRadius: 'var(--radius)',
                boxShadow:   'var(--shadow)',
              },
              success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-2)' } },
              error:   { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-2)' } },
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
    </ThemeProvider>
  );
}
