import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './ui/Icon';
import { chime, formatDuration } from '../utils/helpers';

const FOCUS = 25 * 60;
const BREAK = 5 * 60;

/** Pomodoro focus timer: 25 min focus → 5 min break. */
export default function FocusTimer() {
  const [phase, setPhase]     = useState('focus');
  const [left, setLeft]       = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    endRef.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        chime();
        const nextPhase = phase === 'focus' ? 'break' : 'focus';
        toast(phase === 'focus' ? 'Focus session done. Take five.' : 'Break’s over. Back to it.', { duration: 6000 });
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('StudyMind', { body: phase === 'focus' ? 'Time for a break!' : 'Break over — time to focus.' });
        }
        setPhase(nextPhase);
        setLeft(nextPhase === 'focus' ? FOCUS : BREAK);
        setRunning(false);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  useEffect(() => {
    document.title = running ? `${formatDuration(left)} · ${phase === 'focus' ? 'Focus' : 'Break'} — StudyMind` : 'StudyMind AI';
  }, [left, running, phase]);

  const start = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    setRunning(true);
  };
  const reset = () => { setRunning(false); setPhase('focus'); setLeft(FOCUS); };

  return (
    <div className={`timer${running ? (phase === 'focus' ? ' running' : ' break') : ''}`} title="Pomodoro focus timer">
      <Icon name="timer" size={14} style={{ color: phase === 'break' ? 'var(--green)' : 'var(--accent)' }} />
      <span>{formatDuration(left)}</span>
      <span className="hide-sm muted" style={{ fontFamily: 'var(--font)', fontSize: 11 }}>{phase === 'focus' ? 'focus' : 'break'}</span>
      <button className="icon-btn" onClick={running ? () => setRunning(false) : start} aria-label={running ? 'Pause timer' : 'Start timer'}>
        <Icon name={running ? 'pause' : 'play'} size={12} />
      </button>
      {(running || left !== FOCUS || phase !== 'focus') && (
        <button className="icon-btn" onClick={reset} aria-label="Reset timer"><Icon name="reset" size={12} /></button>
      )}
    </div>
  );
}
