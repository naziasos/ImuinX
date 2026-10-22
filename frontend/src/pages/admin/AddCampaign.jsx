import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

// Admin: publish a public vaccine campaign. It appears in the notification
// bell on the home page for everyone and can be booked without an account.
export default function AddCampaign({ onBack }) {
  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [vaccines, setVaccines] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    vaccineId: "",
    doseNumber: 1,
    startDate: "",
    endDate: "",
    clinicIds: [],
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API}/campaigns`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch {
      /* list is optional */
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [v, c] = await Promise.all([
          fetch(`${API}/vaccines`, { headers: authHeaders }).then((r) => r.json()),
          fetch(`${API}/clinics`).then((r) => r.json()),
        ]);
        setVaccines(v.vaccines || []);
        setClinics(c.clinics || []);
      } catch {
        setError("Could not load vaccines and clinics.");
      }
      loadCampaigns();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const toggleClinic = (id) =>
    setForm((p) => ({
      ...p,
      clinicIds: p.clinicIds.includes(id)
        ? p.clinicIds.filter((x) => x !== id)
        : [...p.clinicIds, id],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ...form, doseNumber: Number(form.doseNumber) }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.message || "Failed to publish campaign.");

      setMessage("Campaign published. It now shows in the notification bell.");
      setForm({ title: "", description: "", vaccineId: "", doseNumber: 1, startDate: "", endDate: "", clinicIds: [] });
      loadCampaigns();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const endCampaign = async (id) => {
    try {
      await fetch(`${API}/campaigns/${id}/deactivate`, { method: "PATCH", headers: authHeaders });
      loadCampaigns();
    } catch {
      setError("Could not end the campaign.");
    }
  };

  const input = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm";

  return (
    <div className="max-w-2xl mx-auto my-10 p-8 bg-white rounded-2xl shadow-lg">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-600 mb-4">
        ← Back to Dashboard
      </button>

      <h2 className="text-2xl font-extrabold text-slate-800">Publish vaccine campaign</h2>
      <p className="text-sm text-slate-500 mt-1">
        Shown in the home page notification bell. Anyone can book without logging in.
      </p>

      {message && <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3">{message}</div>}
      {error && <div className="mt-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>}

      <form onSubmit={submit} className="mt-5 space-y-4">
        <input className={input} placeholder="Campaign title *" value={form.title} onChange={set("title")} required maxLength={120} />
        <textarea className={input} placeholder="Short description" value={form.description} onChange={set("description")} maxLength={500} rows={3} />

        <div className="grid sm:grid-cols-2 gap-4">
          <select className={input} value={form.vaccineId} onChange={set("vaccineId")} required>
            <option value="">Select vaccine *</option>
            {vaccines.map((v) => (
              <option key={v._id} value={v._id}>{v.name}</option>
            ))}
          </select>
          <input className={input} type="number" min="1" value={form.doseNumber} onChange={set("doseNumber")} placeholder="Dose number" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm text-slate-600">
            Start date *
            <input className={input} type="date" value={form.startDate} onChange={set("startDate")} required />
          </label>
          <label className="text-sm text-slate-600">
            End date *
            <input className={input} type="date" value={form.endDate} onChange={set("endDate")} required />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-700 mb-2">
            Clinics (leave empty for all active clinics)
          </legend>
          <div className="flex flex-wrap gap-2">
            {clinics.map((c) => (
              <button
                type="button"
                key={c._id}
                onClick={() => toggleClinic(c._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  form.clinicIds.includes(c._id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold disabled:opacity-50"
        >
          {saving ? "Publishing..." : "Publish campaign"}
        </button>
      </form>

      {campaigns.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-slate-800 mb-2">Campaigns</h3>
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li key={c._id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm">
                <span>
                  <b>{c.title}</b> · {c.vaccineId?.name} · {c.startDate} → {c.endDate}
                  {!c.isActive && <em className="text-slate-400"> (ended)</em>}
                </span>
                {c.isActive && (
                  <button onClick={() => endCampaign(c._id)} className="text-rose-600 font-semibold text-xs">
                    End
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
