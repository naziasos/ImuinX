import { useEffect, useMemo, useRef, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import PasswordStrength from '../components/PasswordStrength';
import { errorMessage } from '../services/api';
import { forgotPassword, resetPassword } from '../services/authService';
import { analyze } from '../utils/password';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ForgotPassword({ onBack, onSuccess }) {
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = reset password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const emailOk = EMAIL_RX.test(email.trim());
  const otpOk = /^\d{6}$/.test(otp.trim());
  const a = analyze(password);
  const { score, lengthOk } = a;
  const confirmOk = confirm.length > 0 && confirm === password;
  const mismatch = confirm.length > 0 && confirm !== password;
  const step2Valid = otpOk && lengthOk && confirmOk;

  const level = useMemo(() => {
    if (status === 'success') return 1;
    if (step === 1) return emailOk ? 0.35 : 0.1;
    return 0.4 + (otpOk ? 0.15 : 0) + (score / 4) * 0.25 + (confirmOk && lengthOk ? 0.2 : 0);
  }, [status, step, emailOk, otpOk, score, confirmOk, lengthOk]);

  const fail = (message) => {
    setError(message);
    setStatus('error');
    later(() => setStatus('idle'), 1300);
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!emailOk || status === 'loading') return;
    setError('');
    setNotice('');
    setStatus('loading');
    try {
      const data = await forgotPassword({ email: email.trim() });
      setStatus('idle');
      setNotice(data.message || 'If that email is registered, a reset OTP has been sent.');
      setStep(2);
    } catch (err) {
      fail(errorMessage(err));
    }
  };

  const resendOtp = async () => {
    if (status === 'loading') return;
    setError('');
    setStatus('loading');
    try {
      const data = await forgotPassword({ email: email.trim() });
      setStatus('idle');
      setNotice(data.message || 'A new OTP has been sent.');
    } catch (err) {
      fail(errorMessage(err));
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!step2Valid || status === 'loading' || status === 'success') return;
    setError('');
    setStatus('loading');
    try {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: password });
      setStatus('success');
      setNotice('Password reset! Redirecting to login…');
      later(() => (onSuccess ? onSuccess() : onBack?.()), reduced() ? 250 : 1400);
    } catch (err) {
      fail(errorMessage(err));
    }
  };

  const busy = status === 'loading' || status === 'success';

  return (
    <AuthLayout
      title={step === 1 ? 'Reset your password' : 'Enter code & new password'}
      subtitle={
        step === 1
          ? "Enter the email on your account and we'll send you a 6-digit reset code."
          : `We sent a 6-digit code to ${email.trim()}. Enter it below with your new password.`
      }
      scene={{ level, status, tint: a.tint, follow: true }}
      footer={
        <>
          Remembered your password?{' '}
          <span className="link-btn" onClick={onBack} role="button" tabIndex={0}>
            Back to login
          </span>
        </>
      }
    >
      <div className="step-tabs">
        <div className={step === 1 ? "step-tab active" : "step-tab"}>
            <span>1</span>
            Verify email
        </div>

        <div className={step === 2 ? "step-tab active" : "step-tab"}>
            <span>2</span>
            New password
        </div>
        </div>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {!error && notice && (
        <p className="notice notice--success" role="status">
          {notice}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={submitEmail}>
          <div className="field">
            <label htmlFor="fp-email">Email</label>
            <input
              id="fp-email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !emailOk}>
            {status === 'loading' ? 'Sending code…' : 'Send reset code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitReset}>
          <div className="field">
            <label htmlFor="fp-otp">6-digit code</label>
            <input
              id="fp-otp"
              className="input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
            <span className="hint">
              Didn't get it?{' '}
              <button type="button" className="link-btn" onClick={resendOtp} disabled={busy}>
                Resend code
              </button>
            </span>
          </div>

          <div className="field">
            <label htmlFor="fp-password">New password</label>
            <div className="pwd">
              <input
                id="fp-password"
                className="input"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="pw-rules"
                required
              />
              <button type="button" className="pwd__toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>

            <PasswordStrength analysis={a} password={password} />
          </div>

          <div className="field">
            <label htmlFor="fp-confirm">Confirm new password</label>
            <input
              id="fp-confirm"
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

          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !step2Valid}>
            {status === 'loading' ? 'Resetting…' : status === 'success' ? 'Password reset!' : 'Reset password'}
          </button>

          <p className="sr-only" role="status">
            {status === 'loading' ? 'Resetting your password' : status === 'success' ? 'Password reset successfully' : ''}
          </p>

          <button
            type="button"
            className="link-btn"
            style={{ display: 'block', marginTop: '0.85rem', textAlign: 'center', width: '100%' }}
            onClick={() => {
              setStep(1);
              setNotice('');
              setError('');
            }}
            disabled={busy}
          >
            ← Use a different email
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
