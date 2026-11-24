import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/ui/Icon';
import { requestLoginCode, verifyLoginCode, errMsg } from '../utils/api';
import '../landing.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LEN = 6;

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/** Six single-digit boxes with paste, backspace and arrow-key support. */
function CodeInput({ value, onChange, onComplete, disabled, error }) {
  const refs = useRef([]);
  const digits = value.padEnd(LEN, ' ').slice(0, LEN).split('');

  const setAt = (i, d) => {
    const next = digits.map((c, j) => (j === i ? d : c)).join('').replace(/\s+$/, '');
    onChange(next);
    if (next.replace(/\s/g, '').length === LEN) onComplete(next);
  };

  const onInput = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    if (raw.length > 1) { // typed fast or pasted into one box
      const merged = (value.slice(0, i) + raw).slice(0, LEN);
      onChange(merged);
      refs.current[Math.min(merged.length, LEN - 1)]?.focus();
      if (merged.length === LEN) onComplete(merged);
      return;
    }
    setAt(i, raw);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i].trim()) setAt(i, ' ');
      else if (i > 0) { setAt(i - 1, ' '); refs.current[i - 1]?.focus(); }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, LEN - 1)]?.focus();
    if (text.length === LEN) onComplete(text);
  };

  return (
    <div className={`otp${error ? ' shake' : ''}`} onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`otp-box${d.trim() ? ' filled' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={LEN}
          value={d.trim()}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const { user, loading, signingIn, login, loginWithToken } = useAuth();
  const { theme, toggle } = useTheme();
  const [step, setStep]       = useState('start'); // start | code
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [devNote, setDevNote] = useState('');
  const [cooldown, setCool]   = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const sendCode = async (e) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) { setError('Enter a valid email address'); return; }
    setBusy(true);
    setError('');
    try {
      const { data } = await requestLoginCode(clean);
      setEmail(clean);
      setCode('');
      setStep('code');
      setCool(data.resendIn || 45);
      setDevNote(data.devNote || '');
      if (step === 'code') toast.success('New code sent');
    } catch (err) {
      setError(errMsg(err, 'Could not send the code'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (full = code) => {
    if (full.replace(/\D/g, '').length !== LEN || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await verifyLoginCode(email, full);
      await loginWithToken(data.token);
      toast.success(data.isNewUser ? 'Welcome to StudyMind' : 'Welcome back');
    } catch (err) {
      setError(errMsg(err, 'That code didn’t work'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login2">
      <aside className="login2-side" aria-hidden="true">
        <Link to="/" className="lp-brand">
          <span className="logo-mark"><Icon name="logo" size={17} /></span>
          <span className="logo-text">Study<em>mind</em></span>
        </Link>
        <div className="login2-quote">
          <p>Your notes are already <em>most of the way</em> to a study guide.</p>
          <span className="hand">we just do the rest →</span>
        </div>
        <div className="login2-card">
          <small>Flashcard · 4 of 12</small>
          <b>What is the final electron acceptor in the electron transport chain?</b>
        </div>
      </aside>

      <main className="login2-main">
        <header>
          <Link to="/" className="back-link"><Icon name="left" size={14} /> Back to home</Link>
          <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </header>

        <div className="login2-form">
          {step === 'start' ? (
            <div className="fade-in" key="start">
              <span className="eyebrow">Sign in or create an account</span>
              <h1>Pull up a chair, <em>open your notes.</em></h1>
              <p className="muted" style={{ fontSize: 15 }}>New here? An account is created the first time you sign in.</p>

              <button className="google-btn" onClick={login} disabled={signingIn || busy}>
                {signingIn ? <span className="spinner" /> : <GoogleLogo />}
                {signingIn ? 'Waiting for Google…' : 'Continue with Google'}
              </button>

              <div className="divider" style={{ margin: '24px 0' }}>or with your email</div>

              <form onSubmit={sendCode} noValidate>
                <label className="label" htmlFor="email">Email address</label>
                <input
                  id="email" type="email" autoComplete="email" className="input auth-input"
                  placeholder="you@university.edu" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  aria-invalid={Boolean(error)} disabled={busy}
                />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="btn-ink auth-submit" disabled={busy || !email.trim()}>
                  {busy ? <span className="spinner" /> : <>Email me a code <span className="arrow">→</span></>}
                </button>
              </form>

              <p className="fine">We’ll send a 6-digit code — no password to remember. By continuing you agree to use StudyMind for good, not for cheating.</p>
            </div>
          ) : (
            <div className="fade-in" key="code">
              <span className="eyebrow">Step 2 of 2</span>
              <h1>Check your <em>inbox.</em></h1>
              <p className="muted" style={{ fontSize: 15 }}>
                We sent a 6-digit code to <b style={{ color: 'var(--text)' }}>{email}</b>. It expires in 10 minutes.
              </p>
              {devNote && <p className="dev-note"><Icon name="lightbulb" size={14} /> {devNote}</p>}

              <form onSubmit={(e) => { e.preventDefault(); verify(); }} style={{ marginTop: 26 }}>
                <CodeInput value={code} onChange={(v) => { setCode(v); setError(''); }} onComplete={verify} disabled={busy} error={error} />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="btn-ink auth-submit" disabled={busy || code.replace(/\D/g, '').length !== LEN}>
                  {busy ? <span className="spinner" /> : <>Verify & sign in <span className="arrow">→</span></>}
                </button>
              </form>

              <div className="row" style={{ justifyContent: 'space-between', marginTop: 20, fontSize: 14 }}>
                <button className="link-btn" onClick={() => { setStep('start'); setError(''); setCode(''); }}>← Use a different email</button>
                <button className="link-btn" onClick={sendCode} disabled={cooldown > 0 || busy}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
              <p className="fine">Can’t find it? Check spam or promotions — it comes from StudyMind.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
