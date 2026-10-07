const VALUES = [
  { icon: "🛡️", title: "Safe by default", desc: "OTP-verified accounts, role-based access and encrypted credentials keep every record private." },
  { icon: "🤝", title: "Built for everyone", desc: "Citizens, health workers and clinic admins each get a focused view made for their job." },
  { icon: "⚡", title: "Fast at the clinic", desc: "Doses, stock and appointments are logged in seconds, so queues move and people wait less." },
];

const STEPS = [
  { title: "Create an account", desc: "Register with your email and confirm it with a one-time code." },
  { title: "Book your visit", desc: "Choose a clinic, vaccine and time slot, or request an in-house visit." },
  { title: "Get vaccinated", desc: "A health worker logs your dose, batch and clinic on the spot." },
  { title: "Carry your proof", desc: "Download a certificate with a QR code that anyone can verify." },
];

const primaryBtn =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 active:scale-95";
const ghostBtn =
  "inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 active:scale-95";

export default function About({ onGetStarted, onServices }) {
  return (
    <div className="-mb-16 bg-slate-50 pb-16">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-20 sm:py-24">
        <div className="pointer-events-none absolute -top-10 left-10 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-white/20">
            About ImuinX
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Vaccination should be simple for everyone involved.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
            ImuinX brings appointments, dose records, vaccine stock and verified
            certificates into one platform, so clinics spend less time on
            paperwork and people spend less time waiting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button onClick={onGetStarted} className={primaryBtn}>Create an account</button>
            <button onClick={onServices} className={ghostBtn}>See our services</button>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-slate-800">What we care about</h2>
          <p className="mt-3 text-slate-500">Three ideas shape every screen in ImuinX.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl bg-white p-8 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-2xl">{v.icon}</div>
              <h3 className="mt-5 text-lg font-bold text-slate-800">{v.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold text-slate-800">How it works</h2>
          <ol className="mt-12 space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-5 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-100">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-md">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-slate-800">{s.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}