// src/components/PasswordStrength.jsx
// Pure UI: renders a strength bar + checklist from the `analyze()` result.
export default function PasswordStrength({ analysis, password }) {
  if (!password) return null;
  const { score, label, tint, checks } = analysis;

  return (
    <div className="pw-strength" id="pw-rules">
      <div className="pw-strength__track" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="pw-strength__seg"
            style={{ backgroundColor: i < score ? tint : undefined }}
          />
        ))}
      </div>
      <p className="pw-strength__label" style={{ color: tint }}>
        {label}
      </p>
      <ul className="pw-strength__checks">
        <li className={checks.length ? 'is-met' : ''}>At least 6 characters</li>
        <li className={checks.upper ? 'is-met' : ''}>An uppercase letter</li>
        <li className={checks.number ? 'is-met' : ''}>A number</li>
        <li className={checks.symbol ? 'is-met' : ''}>A symbol</li>
      </ul>
    </div>
  );
}
