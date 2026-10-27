import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Icon from "../../components/Icons";

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

  return (
    <>
      <PageHeader
        icon="megaphone"
        eyebrow="Vaccination"
        title="Publish vaccine campaign"
        description="Shown in the home page notification bell. Anyone can book without logging in."
        
      />

      <div className="cz-stack">
        <section className="cz-card cz-form-card fx-rise" style={{ "--fx-i": 0 }}>
          {message && (
            <div className="cz-alert cz-alert--success" role="status">
              {message}
            </div>
          )}
          {error && (
            <div className="cz-alert cz-alert--error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="cz-field">
              <input className="cz-input" placeholder="Campaign title *" value={form.title} onChange={set("title")} required maxLength={120} />
            </div>
            <div className="cz-field">
              <textarea className="cz-textarea" placeholder="Short description" value={form.description} onChange={set("description")} maxLength={500} rows={3} />
            </div>

            <div className="cz-form-grid">
              <div className="cz-field">
                <select className="cz-select" value={form.vaccineId} onChange={set("vaccineId")} required>
                  <option value="">Select vaccine *</option>
                  {vaccines.map((v) => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="cz-field">
                <input className="cz-input" type="number" min="1" value={form.doseNumber} onChange={set("doseNumber")} placeholder="Dose number" />
              </div>
            </div>

            <div className="cz-form-grid">
              <label className="cz-field">
                <span className="cz-label">Start date *</span>
                <input className="cz-input" type="date" value={form.startDate} onChange={set("startDate")} required />
              </label>
              <label className="cz-field">
                <span className="cz-label">End date *</span>
                <input className="cz-input" type="date" value={form.endDate} onChange={set("endDate")} required />
              </label>
            </div>

            <fieldset className="cz-fieldset">
              <legend>Clinics (leave empty for all active clinics)</legend>
              <div className="cz-chips">
                {clinics.map((c) => (
                  <button
                    type="button"
                    key={c._id}
                    onClick={() => toggleClinic(c._id)}
                    className={`cz-chip ${form.clinicIds.includes(c._id) ? "is-selected" : ""}`}
                    aria-pressed={form.clinicIds.includes(c._id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <button type="submit" disabled={saving} className="cz-btn cz-btn--primary cz-btn--block">
              {saving ? "Publishing..." : "Publish campaign"}
            </button>
          </form>
        </section>

        {campaigns.length > 0 && (
          <section className="cz-card fx-rise" style={{ "--fx-i": 1 }}>
            <div className="cz-card__head">
              <h2>Campaigns</h2>
            </div>
            <div className="cz-request-list">
              {campaigns.map((c) => (
                <div key={c._id} className="cz-item" data-tilt>
                  <div className="cz-item__top">
                    <div>
                      <h3>{c.title}</h3>
                      <p>
                        {c.vaccineId?.name} · {c.startDate} → {c.endDate}
                      </p>
                    </div>
                    {c.isActive ? (
                      <span className="cz-badge cz-badge--green">Active</span>
                    ) : (
                      <span className="cz-badge cz-badge--gray">(ended)</span>
                    )}
                  </div>
                  {c.isActive && (
                    <button type="button" onClick={() => endCampaign(c._id)} className="cz-link-btn">
                      End
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
