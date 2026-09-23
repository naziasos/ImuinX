import { useEffect, useMemo, useRef, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { errorMessage } from '../services/api';
import PasswordStrength from '../components/PasswordStrength';
import { register } from '../services/authService';
import { analyze } from '../utils/password';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Register({onRegisterSuccess, onLoginClick}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState('');
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL_RX.test(email.trim());
  const a = analyze(password);
  const { score, lengthOk } = a;
  const confirmOk = confirm.length > 0 && confirm === password;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = nameOk && emailOk && lengthOk && confirmOk;

  // vial level: 15% base + name 15% + email 20% + password up to 25% + matching confirm 20%
  const level = useMemo(() => {
    if (status === 'success') return 1;
    return 0.15 + (nameOk ? 0.15 : 0) + (emailOk ? 0.2 : 0) + (score / 4) * 0.25 + (confirmOk && lengthOk ? 0.2 : 0);
  }, [status, nameOk, emailOk, score, confirmOk, lengthOk]);


  const fail = (message) => {
    setError(message);
    setStatus('error');
    later(() => setStatus('idle'), 1300);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || status === 'loading' || status === 'success') return;
    setError('');
    setStatus('loading');
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      setStatus('success');
      later(
        () => onRegisterSuccess && onRegisterSuccess(email.trim()),
        reduced() ? 250 : 1200
      );
    } catch (err) {
      fail(errorMessage(err));
    }
  };

  const busy = status === 'loading' || status === 'success';

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register to use the vaccine system. A system admin can then give you access to a clinic."
      scene={{ level, status, tint: a.tint, follow: true }}
      footer={
        <>
          Already have an account?{' '}
          <button type="button" className="link-button" onClick={onLoginClick}>
            Sign in
          </button>
        </>
      }
    >
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="pwd">
            <input
              id="password"
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="pw-rules"
              required
            />
            <button
              type="button"
              className="pwd__toggle"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.34 3.36M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <PasswordStrength analysis={a} password={password} />
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            className="input"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
            required
          />
          {mismatch && <span className="hint hint--error">The passwords do not match.</span>}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={busy || !valid}>
          {status === 'loading' ? 'Creating account…' : status === 'success' ? 'OTP sent!' : 'Create account'}
        </button>
        <p className="sr-only" role="status">
          {status === 'loading' ? 'Creating your account' : status === 'success' ? 'Account created, OTP sent to your email' : ''}
        </p>
      </form>
    </AuthLayout>
  );
}
