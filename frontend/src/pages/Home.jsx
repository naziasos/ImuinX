import { useRef } from "react";

const STATS = [
  { label: "Clinics onboarded", value: "120+" },
  { label: "Vaccinations tracked", value: "1.2M+" },
  { label: "Citizens registered", value: "300K+" },
];

const FEATURES = [
  {
    title: "Role-based dashboards",
    desc: "Separate, focused views for admins, clinic admins, workers and citizens.",
    icon: "layers",
  },
  {
    title: "Real-time inventory",
    desc: "Track vaccine stock across clinics and get alerts before it runs low.",
    icon: "box",
  },
  {
    title: "Secure by design",
    desc: "OTP-verified accounts and encrypted credentials, end to end.",
    icon: "shield",
  },
];

function Icon({ name, className }) {
  const paths = {
    layers: (
      <>
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </>
    ),
    box: (
      <>
        <path d="M21 8V16.5a1 1 0 0 1-.5.87l-8 4.5a1 1 0 0 1-1 0l-8-4.5A1 1 0 0 1 3 16.5V8" />
        <path d="M3.27 6.96 12 12l8.73-5.04" />
        <path d="M12 22V12" />
        <path d="M7.5 4.27 16.5 9.5" />
      </>
    ),
    shield: (
      <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" />
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export default function Home({ onGetStarted, onLogin }) {
  const sceneRef = useRef(null);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const scene = sceneRef.current;
    const card = cardRef.current;
    if (!scene || !card) return;
    const rect = scene.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
    }
  };

  return (
    <div className="overflow-hidden">
      {/* ================= HERO ================= */}
      <section
        ref={sceneRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-20 sm:py-28"
        style={{ perspective: "1200px" }}
      >
        {/* floating ambient blobs */}
        <div className="pointer-events-none absolute top-10 left-10 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl animate-[float_7s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl animate-[float_9s_ease-in-out_infinite_reverse]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:26px_26px] opacity-40" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-white/20">
              Vaccination Management, Reimagined
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Immunize smarter with{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                ImuinX
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              One platform for clinics, health workers and citizens to manage
              appointments, track inventory and stay verified — all in real
              time.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={onGetStarted}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition-transform duration-150 hover:scale-105"
              >
                Get Started
              </button>
              <button
                onClick={onLogin}
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-white/10"
              >
                Sign In
              </button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3D tilting card */}
          <div className="flex justify-center" style={{ perspective: "1000px" }}>
            <div
              ref={cardRef}
              className="relative h-72 w-72 rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.03] shadow-2xl ring-1 ring-white/15 backdrop-blur-xl transition-transform duration-150 ease-out sm:h-80 sm:w-80"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-950/40 ring-1 ring-white/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-900/50 animate-[float_5s_ease-in-out_infinite]">
                  <Icon name="shield" className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm font-semibold text-white">Dose verified</p>
                <p className="text-xs text-slate-400">Synced across clinics</p>
              </div>

              {/* orbiting mini badges */}
              <div className="absolute -top-4 -right-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg animate-[float_6s_ease-in-out_infinite]">
                <Icon name="box" className="h-5 w-5 text-blue-600" />
              </div>
              <div className="absolute -bottom-5 -left-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg animate-[float_8s_ease-in-out_infinite_reverse]">
                <Icon name="layers" className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-slate-800">
              Everything a modern clinic needs
            </h2>
            <p className="mt-3 text-slate-500">
              Built for the whole vaccination workflow, from registration to
              the final dose.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-2xl bg-white p-8 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={{ perspective: "800px" }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md transition-transform duration-300 group-hover:rotate-6">
                  <Icon name={f.icon} className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-800">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-2xl font-extrabold text-white">
              Ready to get started?
            </h3>
            <p className="mt-1 text-blue-100">
              Create your account in less than a minute.
            </p>
          </div>
          <button
            onClick={onGetStarted}
            className="whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-lg transition-transform duration-150 hover:scale-105"
          >
            Create Account
          </button>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
