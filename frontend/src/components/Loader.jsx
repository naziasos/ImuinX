import { useEffect, useRef, useState } from "react";
import "./Loader.css";

const WORD_PROPS = {
  x: 40,
  y: 150,
  fontSize: 150,
  fontWeight: 800,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  textLength: 560,
  lengthAdjust: "spacingAndGlyphs",
};

const WAVE =
  "M0 0 Q80 -12 160 0 T320 0 T480 0 T640 0 T800 0 T960 0 T1120 0 T1280 0 V260 H0 Z";

const BUBBLES = [
  { x: 92, y: 120, r: 3, d: 2.4, s: 0 },
  { x: 168, y: 140, r: 2, d: 3.1, s: -1.2 },
  { x: 262, y: 110, r: 3.5, d: 2.8, s: -0.6 },
  { x: 340, y: 150, r: 2, d: 2.2, s: -1.8 },
  { x: 428, y: 125, r: 3, d: 3.4, s: -0.9 },
  { x: 506, y: 145, r: 2.5, d: 2.6, s: -2.1 },
  { x: 560, y: 115, r: 2, d: 3, s: -1.5 },
];

const DURATION = 1000; 
const HOLD = 200; 
const LEAVE = 500; 

export default function Loader({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const duration = reduce ? 600 : DURATION;
    const leave = reduce ? 0 : LEAVE;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let raf;
    let start;
    const timers = [];

    const tick = (now) => {
      if (start === undefined) start = now;
      const t = Math.min((now - start) / duration, 1);
      setProgress((1 - Math.pow(1 - t, 2.2)) * 100);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        timers.push(setTimeout(() => setLeaving(true), HOLD));
        timers.push(setTimeout(() => doneRef.current?.(), HOLD + leave));
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // liquid surface: 168 (below the letters) -> 20 (above the letters)
  const level = 168 - (progress / 100) * 148;

  return (
    <div
      className={`ix-loader${leaving ? " is-leaving" : ""}`}
      style={{ "--p": progress / 100 }}
      role="status"
      aria-live="polite"
      aria-label="Loading ImuinX"
    >
      <div className="ix-loader__glow" />

      <div className="ix-loader__body">
        <svg className="ix-loader__word" viewBox="0 0 640 190" aria-hidden="true">
          <defs>
            <clipPath id="ix-word-clip">
              <text {...WORD_PROPS}>ImuinX</text>
            </clipPath>
            <linearGradient id="ix-liquid" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="150">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          <text {...WORD_PROPS} className="ix-loader__outline">
            ImuinX
          </text>

          <g clipPath="url(#ix-word-clip)">
            <g style={{ transform: `translateY(${level}px)` }}>
              <g className="ix-loader__wave ix-loader__wave--back">
                <path d={WAVE} transform="translate(0 -7)" fill="#5eead4" />
              </g>
              <g className="ix-loader__wave">
                <path d={WAVE} fill="url(#ix-liquid)" />
              </g>
              {BUBBLES.map((b, i) => (
                <circle
                  key={i}
                  className="ix-loader__bubble"
                  cx={b.x}
                  cy={b.y}
                  r={b.r}
                  style={{
                    animationDuration: `${b.d}s`,
                    animationDelay: `${b.s}s`,
                  }}
                />
              ))}
            </g>
          </g>
        </svg>

        <p className="ix-loader__pct">
          {Math.round(progress)}
          <span>%</span>
        </p>
        <p className="ix-loader__note">Vaccination Management System</p>
      </div>
    </div>
  );
}
