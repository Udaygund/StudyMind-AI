import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithCustomToken, signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth, googleProvider } from '../firebase';
import { syncUser } from '../utils/api';

const AuthContext = createContext(null);

const POPUP_DISMISSED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!auth) { setLoading(false); return undefined; }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      // Sync in the background — don't block the UI on the backend.
      if (firebaseUser) syncUser().catch((err) => console.warn('Backend sync failed:', err?.message));
    });
    return unsub;
  }, []);

  const login = useCallback(async () => {
    if (!auth) return;
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (!POPUP_DISMISSED.includes(err?.code)) {
        toast.error(err?.code === 'auth/popup-blocked'
          ? 'Popup blocked — allow popups for this site'
          : 'Sign-in failed — please try again');
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  // Email one-time-code sign-in: the backend verifies the code and returns a Firebase custom token.
  const loginWithToken = useCallback(async (token) => {
    if (!auth) return;
    await signInWithCustomToken(auth, token);
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signingIn, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
