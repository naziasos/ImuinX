import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

function todayString() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Steps({ step }) {
  const labels = ["Your details", "Verify email", "Appointment ID"];

  return (
    <ol className="flex items-center gap-2 mt-5 mb-1 text-xs font-semibold">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center ${
              step >= i + 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={step >= i + 1 ? "text-slate-800" : "text-slate-400"}>
            {label}
          </span>
          {i < labels.length - 1 && <span className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  );
}

// Public page: book a campaign slot with no login or registration.
// Step 1 details -> Step 2 email code -> Step 3 Appointment ID.
export default function CampaignBooking({ campaign, onBack, onGetCertificate }) {
  const clinics = campaign?.clinics || [];

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    clinicId: clinics.length === 1 ? clinics[0]._id : "",
    date: "",
    time: "",
  });
  const [otp, setOtp] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const minDate =
    campaign && todayString() > campaign.startDate ? todayString() : campaign?.startDate;

  const update = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
      ...(field === "clinicId" || field === "date" ? { time: "" } : {}),
    }));

  useEffect(() => {
    if (!campaign || !form.clinicId || !form.date) {
      setSlots([]);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setSlotLoading(true);
      setError("");

      try {
        const res = await fetch(
          `${API}/campaigns/${campaign._id}/slots?clinicId=${form.clinicId}&date=${form.date}`
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.message || "Could not load slots.");
        if (!cancelled) setSlots(data.availableSlots || []);
      } catch (err) {
        if (!cancelled) {
          setSlots([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaign, form.clinicId, form.date]);

  if (!campaign) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-2xl shadow text-center">
        <p className="text-slate-600 mb-4">This campaign is no longer available.</p>
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold"
        >
          Back to home
        </button>
      </div>
    );
  }

  const post = async (path, body) => {
    const res = await fetch(`${API}/campaigns/${campaign._id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.message || "Something went wrong.");
    return data;
  };

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const data = await post("book/request-otp", form);
      setInfo(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await post("book/confirm", { email: form.email, otp });
      setResult(data.summary);
      setStep(3);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setBusy(false);
    }
  };

  const bookAnotherPerson = () => {
    setForm((prev) => ({
        name: "",
        email: prev.email,
        phone: "",
        dateOfBirth: "",
        gender: "",
        clinicId: clinics.length === 1 ? clinics[0]._id : "",
        date: "",
        time: "",
    }));
    setOtp("");
    setResult(null);
    setStep(1);
    setError("");
    setInfo("");
    setCopied(false);
    };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(result.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; the code is visible anyway */
    }
  };

  const Label = ({ children }) => (
    <label className="block text-sm font-semibold text-slate-700 mb-1">{children}</label>
  );

  /* ---------------- Step 3: Appointment ID ---------------- */
  if (step === 3 && result) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-lg text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-2xl font-extrabold text-slate-800">You're booked!</h2>
        <p className="text-slate-600 mt-2">
          {result.name}, your {result.vaccine} appointment is confirmed.
        </p>

        <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Your Appointment ID
          </p>
          <p className="text-3xl font-extrabold tracking-widest text-slate-800 mt-1">
            {result.bookingCode}
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-2 text-xs font-semibold text-blue-600"
          >
            {copied ? "Copied ✓" : "Copy ID"}
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-left space-y-1">
          <p><b>Campaign:</b> {result.campaign}</p>
          <p><b>Clinic:</b> {result.clinic}</p>
          <p><b>When:</b> {result.when}</p>
        </div>

        <ul className="mt-5 text-sm text-slate-600 text-left list-disc pl-5 space-y-1">
          <li>We also emailed this ID to {result.email}.</li>
          <li>Bring a photo ID and show your Appointment ID to the health worker.</li>
          <li>After your dose, get your certificate with "Get Certificate".</li>
        </ul>

        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={bookAnotherPerson}
            className="px-5 py-2.5 rounded-full border border-blue-200 text-blue-700 font-semibold"
            >
            Book for Another Person
            </button>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-10 p-8 bg-white rounded-2xl shadow-lg">
      <button
        type="button"
        onClick={step === 2 ? () => setStep(1) : onBack}
        className="text-sm font-semibold text-blue-600 mb-4"
      >
        ← Back
      </button>

      <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
        📢 Vaccine campaign
      </span>
      <h2 className="text-2xl font-extrabold text-slate-800 mt-3">{campaign.title}</h2>
      <p className="text-sm text-slate-500 mt-1">
        {campaign.vaccine?.name} · Dose {campaign.doseNumber} · {campaign.startDate} to{" "}
        {campaign.endDate}
      </p>
      {campaign.description && (
        <p className="text-sm text-slate-600 mt-2">{campaign.description}</p>
      )}
      <p className="text-sm font-semibold text-emerald-700 mt-2">
        No login or registration needed.
      </p>

      <Steps step={step} />

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3" role="alert">
          {error}
        </div>
      )}

      {/* ---------------- Step 1: details ---------------- */}
      {step === 1 && (
        <form onSubmit={sendCode} className="mt-4 space-y-4">
          <div>
            <Label>Full name *</Label>
            <input className={inputClass} value={form.name} onChange={update("name")} required maxLength={80} />
          </div>

          <div>
            <Label>Email * (we send your verification code here)</Label>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@gmail.com"
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              You can use the same email to book for multiple people. Submit one person's details at a time; each person gets a separate Appointment ID and certificate.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Date of birth *</Label>
              <input
                className={inputClass}
                type="date"
                max={todayString()}
                value={form.dateOfBirth}
                onChange={update("dateOfBirth")}
                required
              />
            </div>
            <div>
              <Label>Gender *</Label>
              <select className={inputClass} value={form.gender} onChange={update("gender")} required>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Phone (optional)</Label>
            <input className={inputClass} type="tel" value={form.phone} onChange={update("phone")} placeholder="01XXXXXXXXX" />
          </div>

          <div>
            <Label>Clinic *</Label>
            <select className={inputClass} value={form.clinicId} onChange={update("clinicId")} required>
              <option value="">Select a clinic</option>
              {clinics.map((clinic) => (
                <option key={clinic._id} value={clinic._id}>
                  {clinic.name}
                  {clinic.location?.city ? ` — ${clinic.location.city}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Date *</Label>
            <input
              className={inputClass}
              type="date"
              value={form.date}
              min={minDate}
              max={campaign.endDate}
              onChange={update("date")}
              required
            />
          </div>

          {form.clinicId && form.date && (
            <div>
              <Label>Time slot *</Label>
              {slotLoading ? (
                <p className="text-sm text-slate-400">Loading slots...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-500">No slots available on this date.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setForm((prev) => ({ ...prev, time: slot }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        form.time === slot
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !form.time}
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold disabled:opacity-50"
          >
            {busy ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      )}

      {/* ---------------- Step 2: OTP ---------------- */}
      {step === 2 && (
        <form onSubmit={confirm} className="mt-4 space-y-4">
          {info && (
            <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
              {info} Check your inbox (and spam folder).
            </div>
          )}

          <div>
            <Label>6-digit code</Label>
            <input
              className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold`}
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy || otp.length !== 6}
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold disabled:opacity-50"
          >
            {busy ? "Confirming..." : "Confirm booking"}
          </button>

          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="w-full text-sm font-semibold text-blue-600"
          >
            Send a new code
          </button>
        </form>
      )}
    </div>
  );
}
