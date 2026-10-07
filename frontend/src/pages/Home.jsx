import { useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";

const FEATURES = [
  {
    icon: "🔐",
    title: "Secure authentication",
    desc: "Email verification, role-based access and safe password reset protect every account.",
  },
  {
    icon: "📅",
    title: "Appointment booking",
    desc: "Pick a clinic, vaccine and time slot in a few taps — reschedule anytime.",
  },
  {
    icon: "📋",
    title: "Vaccination records",
    desc: "Every dose, batch and clinic logged in one timeline, including family members.",
  },
  {
    icon: "🏠",
    title: "In-house visit requests",
    desc: "Request a trained health worker to visit home for those who can't travel.",
  },
  {
    icon: "⏱️",
    title: "Live queue management",
    desc: "See your token and estimated wait in real time, so you can plan your time.",
  },
  {
    icon: "🔔",
    title: "Smart reminders",
    desc: "Timely nudges for upcoming doses, appointments and visits.",
  },
];

const ROLES = [
  {
    icon: "🧑",
    title: "Citizens",
    points: [
      "Book & manage visits",
      "Download certificates",
      "Manage family accounts",
    ],
  },
  {
    icon: "🩺",
    title: "Health workers",
    points: ["Log doses in seconds", "Run the live queue", "Handle home visits"],
  },
  {
    icon: "📊",
    title: "Administrators",
    points: ["Inventory & batches", "Duty assignment", "Feedback & insights"],
  },
];

const NOTES = [
  { icon: "🔔", title: "Dose 2 due in 3 days", sub: "Tap to book your slot" },
  { icon: "📅", title: "Appointment tomorrow, 10:30", sub: "Bring your ID" },
  { icon: "🏠", title: "Home visit confirmed", sub: "Worker arrives 2–3 PM" },
];

const CLINICS = [
  { n: "Green Crescent Clinic", d: "0.8 km", w: 6, x: 130, y: 100 },
  { n: "City Care Center", d: "1.4 km", w: 12, x: 270, y: 140 },
  { n: "Lakeview Health Post", d: "2.1 km", w: 3, x: 330, y: 62 },
  { n: "Riverside Community Clinic", d: "2.9 km", w: 9, x: 70, y: 158 },
];

/* ---------- small helpers ---------- */

const tiltMove = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(700px) rotateX(${y * -10}deg) rotateY(${
    x * 10
  }deg) translateY(-4px)`;
};
const tiltLeave = (e) => {
  e.currentTarget.style.transform = "";
};

/* Scroll-reveal wrapper (optionally with the hover tilt) */
function Rv({ as: Tag = "div", className = "", tilt = false, children, ...rest }) {
  const ref = useRef(null);
  const [state, setState] = useState("hidden");

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let t;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("in");
          t = setTimeout(() => setState("done"), 900);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const tiltProps = tilt ? { onMouseMove: tiltMove, onMouseLeave: tiltLeave } : {};

  return (
    <Tag
      ref={ref}
      className={`hx-rv${state !== "hidden" ? " in" : ""}${
        state === "done" ? " done" : ""
      } ${className}`}
      {...tiltProps}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function Vial({ className }) {
  return (
    <div className={`hx-vial ${className}`}>
      <div className="hx-cap" />
      <div className="hx-glass">
        <div className="hx-liq" />
        <div className="hx-lbl">
          <i />
        </div>
      </div>
    </div>
  );
}
/* Family illustration: parent holding a baby, holding a child's hand */
function Family() {
  return (
    <svg
      className="hx-family"
      viewBox="0 0 420 215"
      role="img"
      aria-label="A parent holding a baby and a child's hand"
    >
      <defs>
        <linearGradient id="hx-blanket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#99f6e4" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="hx-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>

      <circle cx="215" cy="125" r="104" fill="#fff" opacity=".6" />
      <ellipse cx="215" cy="206" rx="170" ry="9" fill="#1e3a8a" opacity=".16" />

      {/* parent */}
      <rect x="171" y="176" width="14" height="28" rx="6" fill="#1e3a8a" />
      <rect x="199" y="176" width="14" height="28" rx="6" fill="#1e3a8a" />
      <ellipse cx="176" cy="205" rx="12" ry="5" fill="#0f172a" />
      <ellipse cx="206" cy="205" rx="12" ry="5" fill="#0f172a" />
      <rect x="185" y="72" width="14" height="18" rx="5" fill="#f2c29b" />
      <path d="M156 90 Q192 74 228 90 L242 182 H142 Z" fill="#2563eb" />
      <circle cx="192" cy="56" r="21" fill="#f2c29b" />
      <path d="M170 56 Q170 30 194 31 Q216 31 214 58 Q206 43 192 43 Q178 43 170 56Z" fill="#1e293b" />
      <circle cx="207" cy="29" r="9" fill="#1e293b" />
      <circle cx="185" cy="59" r="1.9" fill="#1e293b" />
      <circle cx="199" cy="59" r="1.9" fill="#1e293b" />
      <path d="M186 67 Q192 72 198 67" fill="none" stroke="#9a3412" strokeWidth="1.8" strokeLinecap="round" />

      {/* baby in the parent's arms */}
      <path d="M146 112 Q150 94 178 98 Q206 104 202 128 Q196 146 168 144 Q144 140 146 112Z" fill="url(#hx-blanket)" />
      <path d="M148 121 Q172 135 200 119" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="160" cy="106" r="13" fill="#f6cfae" />
      <path d="M154 96 Q160 89 167 96" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M154 108 q3 3 6 0 M162 108 q3 3 6 0" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="153" cy="113" r="2.6" fill="#fb7185" opacity=".5" />
      <circle cx="171" cy="113" r="2.6" fill="#fb7185" opacity=".5" />
      <path d="M160 96 Q140 136 196 142" fill="none" stroke="#1d4ed8" strokeWidth="15" strokeLinecap="round" />
      <circle cx="199" cy="142" r="7" fill="#f2c29b" />

      {/* parent's other hand holds the child's */}
      <path d="M226 94 Q250 120 254 150" fill="none" stroke="#2563eb" strokeWidth="14" strokeLinecap="round" />
      <circle cx="255" cy="153" r="7" fill="#f2c29b" />

      {/* child */}
      <rect x="288" y="176" width="10" height="26" rx="4" fill="#f2c29b" />
      <rect x="304" y="176" width="10" height="26" rx="4" fill="#f2c29b" />
      <ellipse cx="293" cy="205" rx="9" ry="4.5" fill="#0f172a" />
      <ellipse cx="311" cy="205" rx="9" ry="4.5" fill="#0f172a" />
      <path d="M278 124 Q300 114 322 124 L326 182 H274 Z" fill="#f59e0b" />
      <path d="M281 134 Q268 148 261 154" fill="none" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" />
      <path d="M319 134 Q327 156 322 170" fill="none" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" />
      <rect x="317" y="141" width="11" height="6" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth=".8" transform="rotate(12 322 144)" />
      <circle cx="259" cy="154" r="5.5" fill="#f2c29b" />
      <circle cx="322" cy="173" r="5" fill="#f2c29b" />
      <circle cx="300" cy="101" r="17" fill="#f2c29b" />
      <path d="M283 99 Q284 81 300 81 Q318 81 317 99 Q310 91 300 91 Q290 91 283 99Z" fill="#7c2d12" />
      <circle cx="294" cy="102" r="1.8" fill="#1e293b" />
      <circle cx="306" cy="102" r="1.8" fill="#1e293b" />
      <path d="M295 108 Q300 112 305 108" fill="none" stroke="#9a3412" strokeWidth="1.7" strokeLinecap="round" />

      {/* floating protection badge + hearts */}
      <g transform="translate(300 38)">
        <g className="hx-badge">
          <path d="M0 -22 L18 -15 V2 C18 14 9 21 0 25 C-9 21 -18 14 -18 2 V-15 Z" fill="url(#hx-shield)" />
          <rect x="-2.5" y="-10" width="5" height="18" rx="2" fill="#fff" />
          <rect x="-9" y="-3.5" width="18" height="5" rx="2" fill="#fff" />
        </g>
      </g>
      <g transform="translate(112 66)">
        <path className="hx-heart" d="M0 7 C-14 -4 -7 -16 0 -8 C7 -16 14 -4 0 7Z" fill="#f472b6" />
      </g>
      <g transform="translate(352 104) scale(.75)">
        <path className="hx-heart hx-heart-2" d="M0 7 C-14 -4 -7 -16 0 -8 C7 -16 14 -4 0 7Z" fill="#fb7185" />
      </g>
    </svg>
  );
}
/* Live queue panel */
function QueuePanel() {
  const [n, setN] = useState(42);

  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1), 3200);
    return () => clearInterval(id);
  }, []);

  const pad = (v) => `A-${String(v).padStart(3, "0")}`;

  return (
    <Rv className="hx-panel">
      <div className="hx-now">
        <div>
          <small>NOW SERVING</small>
          <div key={n} className="hx-big hx-tick">
            {pad(n)}
          </div>
        </div>
        <small>Est. wait · {8 + (n % 5) * 2} min</small>
      </div>
      <div>
        {[1, 2, 3, 4].map((i) => (
          <div className="hx-q" key={`${n}-${i}`}>
            <b>{pad(n + i)}</b>
            <div className="hx-bar">
              <i style={{ width: `${100 - i * 22}%` }} />
            </div>
            <em>~{i * 4} min</em>
          </div>
        ))}
      </div>
    </Rv>
  );
}

/* Certificate with generated QR pattern */
function Certificate() {
  const cells = useMemo(() => {
    const out = [];
    let s = 7;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const finder = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
        s = (s * 73 + 19) % 101;
        const on = finder
          ? !(x % 3 === 1 && y % 3 === 1) &&
            (x % 3 === 0 || x % 3 === 2 || y % 3 === 0 || y % 3 === 2)
          : s % 2;
        if (on) out.push([x, y]);
      }
    }
    return out;
  }, []);

  return (
    <Rv className="hx-cw">
      <div className="hx-cert">
        <h4>ImuinX · Vaccination Certificate</h4>
        <div className="hx-nm">Sample Citizen</div>
        <div className="hx-row">
          <ul>
            <li>Vaccine A · Dose 1 · 12 Mar</li>
            <li>Vaccine A · Dose 2 · 09 Apr</li>
            <li>Booster · 14 Sep</li>
          </ul>
          <svg className="hx-qr" viewBox="0 0 9 9" aria-label="QR code">
            {cells.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" />
            ))}
          </svg>
        </div>
        <span className="hx-ok">✔ Verified by scan</span>
      </div>
    </Rv>
  );
}

/* Clinic map */
function ClinicMap() {
  const [sel, setSel] = useState(0);

  return (
    <Rv className="hx-mapbox">
      <svg
        className="hx-map"
        viewBox="0 0 400 270"
        role="img"
        aria-label="Interactive map of nearby clinics"
      >
        <rect width="400" height="270" fill="var(--map)" />
        <path
          d="M-10 190C80 150 140 230 230 190S360 150 420 175V215C340 195 250 245 170 235S40 200 -10 225Z"
          fill="var(--water)"
        />
        <g fill="var(--park)">
          <rect x="40" y="26" width="80" height="55" rx="14" />
          <rect x="290" y="24" width="70" height="46" rx="14" />
        </g>
        <g stroke="var(--road)" strokeWidth="7" fill="none" strokeLinecap="round">
          <path d="M0 100H400" />
          <path d="M130 0V270" />
          <path d="M270 0V270" />
          <path d="M0 40L400 140" />
        </g>
        <g>
          {CLINICS.map((c, i) => (
            <g
              key={c.n}
              className={`hx-pin${sel === i ? " on" : ""}`}
              tabIndex={0}
              role="button"
              transform={`translate(${c.x} ${c.y})`}
              aria-label={c.n}
              onClick={() => setSel(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSel(i);
              }}
            >
              <circle className="pu" r="8" />
              <path d="M0 0c-9-12-13-18-13-24a13 13 0 0126 0c0 6-4 12-13 24z" />
              <circle cy="-24" r="5" fill="#fff" />
            </g>
          ))}
        </g>
        <circle className="hx-you" cx="200" cy="118" r="7" />
      </svg>

      <div className="hx-list">
        {CLINICS.map((c, i) => (
          <button
            type="button"
            key={c.n}
            className={`hx-cl${sel === i ? " on" : ""}`}
            onClick={() => setSel(i)}
            onMouseEnter={() => setSel(i)}
          >
            <b>{c.n}</b>
            <small>
              {c.d} away · {c.w} waiting · Open now
            </small>
          </button>
        ))}
      </div>
    </Rv>
  );
}

/* ---------- page ---------- */

export default function Home({ onGetStarted }) {
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const mapSectionRef = useRef(null);

  const handleSceneMove = (e) => {
    const sc = sceneRef.current;
    const st = stageRef.current;
    if (!sc || !st) return;
    const r = sc.getBoundingClientRect();
    st.style.transform = `rotateX(${
      ((e.clientY - r.top) / r.height - 0.5) * -16
    }deg) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 24}deg)`;
  };
  const handleSceneLeave = () => {
    if (stageRef.current) stageRef.current.style.transform = "";
  };

  const scrollToClinics = () =>
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="hx">
      {/* ================= HERO ================= */}
      <header className="hx-hero">
        <div className="hx-wrap">
          <div>
            <span className="hx-tag">🛡️ Trusted, secure &amp; accessible</span>
            <h1>
              Vaccination care, <span>simplified</span> for everyone.
            </h1>
            <p className="hx-lead">
              Book appointments, track every dose, skip the waiting room and
              carry verified certificates — all in one place for citizens,
              health workers and clinic admins.
            </p>
            <div className="hx-cta">
              <button type="button" className="hx-btn hx-btn-p" onClick={onGetStarted}>
                Book an appointment
              </button>
              <button type="button" className="hx-btn" onClick={scrollToClinics}>
                Find a clinic
              </button>
            </div>
            <div className="hx-trust">
              <span>✔ Encrypted records</span>
              <span>✔ QR-verified certificates</span>
              <span>✔ In-house visits</span>
            </div>
          </div>

          <div
            className="hx-scene"
            ref={sceneRef}
            onMouseMove={handleSceneMove}
            onMouseLeave={handleSceneLeave}
          >
            <div className="hx-stage" ref={stageRef}>
              <div className="hx-shadow" />
              <Vial className="hx-v1" />
              <Vial className="hx-v2" />
              <Vial className="hx-v3" />
              <div className="hx-stage" ref={stageRef}>
              <div className="hx-shadow" />
              <Vial className="hx-v1" />
              <Vial className="hx-v2" />
              <Vial className="hx-v3" />
              <Family />
            </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= FEATURES ================= */}
      <section className="hx-sec">
        <div className="hx-wrap">
          <Rv>
            <span className="hx-eyebrow">Everything in one place</span>
            <h2>Built for every step of vaccination</h2>
            <p className="hx-sub">
              From signing in securely to showing a verified certificate, each
              feature is designed to be fast, clear and easy for all ages.
            </p>
          </Rv>
          <div className="hx-grid">
            {FEATURES.map((f) => (
              <Rv className="hx-card" tilt key={f.title}>
                <div className="hx-ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ================= LIVE QUEUE ================= */}
      <section className="hx-sec">
        <div className="hx-wrap hx-split">
          <Rv>
            <span className="hx-eyebrow">Live queue</span>
            <h2>No more guessing how long it will take</h2>
            <p className="hx-sub">
              Clinic staff update the queue as each person is served. Citizens
              watch their token move up from anywhere, and admins see load at a
              glance.
            </p>
          </Rv>
          <QueuePanel />
        </div>
      </section>

      {/* ================= CERTIFICATES ================= */}
      <section className="hx-sec">
        <div className="hx-wrap hx-split">
          <Certificate />
          <Rv>
            <span className="hx-eyebrow">Certificates &amp; reminders</span>
            <h2>Proof you can trust, nudges you won&apos;t miss</h2>
            <p className="hx-sub">
              Every certificate carries a scannable QR code that anyone can
              verify instantly. Reminders keep the next dose on schedule.
            </p>
            <div className="hx-notes">
              {NOTES.map((n) => (
                <div className="hx-note" key={n.title}>
                  <span>{n.icon}</span>
                  <div>
                    <b>{n.title}</b>
                    <small>{n.sub}</small>
                  </div>
                </div>
              ))}
            </div>
          </Rv>
        </div>
      </section>

      {/* ================= CLINICS ================= */}
      <section className="hx-sec hx-map-sec" ref={mapSectionRef}>
        <div className="hx-wrap">
          <Rv>
            <span className="hx-eyebrow">Nearby clinics</span>
            <h2>Find the closest clinic with the shortest wait</h2>
          </Rv>
          <ClinicMap />
        </div>
      </section>

      {/* ================= ROLES ================= */}
      <section id="who-its-for" className="hx-sec hx-roles">
        <div className="hx-wrap">
          <Rv>
            <span className="hx-eyebrow">One platform, three roles</span>
            <h2>Designed for everyone involved</h2>
          </Rv>
          <div className="hx-grid">
            {ROLES.map((r) => (
              <Rv className="hx-card" tilt key={r.title}>
                <div className="hx-ico">{r.icon}</div>
                <h3>{r.title}</h3>
                <ul>
                  {r.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="hx-sec">
        <div className="hx-wrap">
          <Rv className="hx-final">
            <h2>Ready for a smoother vaccination experience?</h2>
            <p>
              Join ImuinX and keep your health records safe, verified and
              always within reach.
            </p>
            <button type="button" className="hx-btn" onClick={onGetStarted}>
              Create your account
            </button>
          </Rv>
        </div>
      </section>
    </div>
  );
}
