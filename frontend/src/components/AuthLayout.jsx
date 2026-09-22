

export default function AuthLayout({ title, subtitle, scene, footer, children }) {
  const { level = 0, status = 'idle', tint = '#8ecb4e' } = scene || {};
  const pct = Math.max(0, Math.min(1, level));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__form">
          <h1 className="auth-card__title">{title}</h1>
          {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}

          {children}

          {footer && <div className="auth-card__footer">{footer}</div>}
        </div>

        <div className="auth-card__scene" aria-hidden="true">
          <div className={`vial vial--${status}`}>
            <div className="vial__glass">
              <div
                className="vial__liquid"
                style={{
                  height: `${pct * 100}%`,
                  backgroundColor: tint,
                  boxShadow: `0 0 24px ${tint}66`,
                }}
              />
              <div className="vial__shine" />
            </div>
            <div className="vial__cap" />
          </div>
          <p className="vial__pct">{Math.round(pct * 100)}%</p>
        </div>
      </div>
    </div>
  );
}
