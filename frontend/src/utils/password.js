// src/utils/password.js
// Pure UI helper: scores a password's strength and returns display data.
// No network calls, no backend involvement.

const MIN_LENGTH = 6; // matches backend's minimum ("Password must be at least 6 characters")

export function analyze(password = '') {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const lengthOk = password.length >= MIN_LENGTH;

  // 0-4 score: one point per character class present, plus a bonus for length >= 10
  let score = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (password.length >= 10 && score > 0) score = Math.min(4, score + 1);
  if (!lengthOk) score = Math.min(score, 1);
  if (password.length === 0) score = 0;

  const levels = [
    { label: 'Too weak', tint: '#e0563a' }, // amber/red
    { label: 'Weak', tint: '#e08a3a' }, // amber
    { label: 'Fair', tint: '#e0c93a' }, // yellow
    { label: 'Good', tint: '#8ecb4e' }, // light green
    { label: 'Strong', tint: '#2fd08a' }, // mint
  ];

  const { label, tint } = levels[score];

  return {
    score,
    lengthOk,
    label,
    tint,
    checks: {
      length: lengthOk,
      lower: hasLower,
      upper: hasUpper,
      number: hasNumber,
      symbol: hasSymbol,
    },
  };
}
