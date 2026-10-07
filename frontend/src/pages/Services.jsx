const SERVICES = [
  {
    icon: "🧑",
    title: "For citizens",
    desc: "Everything you need before, during and after your vaccine.",
    items: ["Book and manage appointments", "Request an in-house visit", "View your vaccination record", "Download QR certificates", "Manage family accounts", "Share feedback with clinics"],
  },
  {
    icon: "🩺",
    title: "For health workers",
    desc: "Fewer forms, faster service at the clinic desk.",
    items: ["Log doses in seconds", "See today's appointments", "Review completed work", "Handle in-house visits"],
  },
  {
    icon: "🏥",
    title: "For clinic admins",
    desc: "Run the whole clinic from one dashboard.",
    items: ["Add and manage workers", "Assign daily duties", "Track vaccine inventory", "Read citizen feedback"],
  },
  {
    icon: "📊",
    title: "For administrators",
    desc: "Oversee every clinic on the platform.",
    items: ["Add and manage clinics", "Create clinic admins", "Monitor platform activity"],
  },
];

const primaryBtn =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 active:scale-95";
const ghostBtn =
  "inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 active:scale-95";

export default function Services({ onGetStarted, onVerify }) {
  return (
    <div className="-mb-16 bg-slate-50 pb-16">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-20 sm:py-24">
        <div className="pointer-events-none absolute -top-10 right-10 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-white/20">
            Services
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            One platform, a tool for every role.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Pick your role to see what ImuinX does for you.
          </p>
        </div>
      </section>

      {/* Service cards */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl bg-white p-8 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-2xl">{s.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{s.title}</h3>
                  <p className="text-sm text-slate-500">{s.desc}</p>
                </div>
              </div>
              <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {s.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-0.5 text-cyan-600">✔</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-12 text-center text-white">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to try it?</h2>
          <p className="mt-2 text-blue-100">Create an account, or check a certificate without signing in.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button onClick={onGetStarted} className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-blue-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95">
              Create an account
            </button>
            <button onClick={onVerify} className={ghostBtn}>Verify a certificate</button>
          </div>
        </div>
      </section>
    </div>
  );
}