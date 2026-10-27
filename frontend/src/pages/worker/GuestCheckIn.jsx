import { useState } from "react";
import { api, errorMessage } from "../../services/api";
import PageHeader from "../../components/PageHeader";
import Icon from "../../components/Icons";

const ID_TYPES = ["National ID", "Birth Registration", "Passport", "Driving License", "Other"];

function age(dob) {
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
  return Number.isFinite(years) ? years : "";
}

// Worker: Appointment ID -> check photo ID -> log dose -> certificate (one screen).
export default function GuestCheckIn({ onBack }) {
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");
  const [batch, setBatch] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const reset = () => {
    setCode("");
    setData(null);
    setIdNumber("");
    setBatch("");
    setChecked(false);
    setError("");
    setDone("");
  };

  const lookup = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await api.post("/guest/worker/lookup", { bookingCode: code });
      setData(res.data);
      setBatch(res.data.batches?.[0]?.batchNumber || "");
    } catch (err) {
      setData(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await api.post("/guest/worker/verify-and-dose", {
        bookingCode: data.appointment.bookingCode,
        idType,
        idNumber,
        batchNumber: batch,
      });
      setDone(res.data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const a = data?.appointment;
  const g = data?.guest;
  const blocked = a && (a.status === "Completed" || a.status === "Cancelled" || a.alreadyVaccinated);

  return (
    <>
      <PageHeader
        icon="idcard"
        eyebrow="Vaccination"
        title="Campaign check-in"
        description="Enter the guest's Appointment ID, check their photo ID, then log the dose."
        actions={
          <button type="button" onClick={onBack} className="cz-btn cz-btn--secondary">
            <Icon name="arrowLeft" size={16} /> Back to Dashboard
          </button>
        }
      />

      <section className="cz-card cz-form-card cz-form-card--narrow fx-rise" style={{ "--fx-i": 0 }}>
        {error && (
          <div className="cz-alert cz-alert--error" role="alert">
            {error}
          </div>
        )}

        {done ? (
          <div className="cz-success-panel">
            <span className="cz-success-panel__icon">
              <Icon name="check" size={30} />
            </span>
            <h3>{done}</h3>
            <p>The guest was emailed how to get the certificate.</p>
            <button onClick={reset} className="cz-btn cz-btn--primary" style={{ marginTop: 14 }}>
              Check in next guest
            </button>
          </div>
        ) : !data ? (
          <form onSubmit={lookup} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              className="cz-input cz-upper"
              style={{ flex: "1 1 220px", width: "auto" }}
              placeholder="IMX-XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" disabled={busy} className="cz-btn cz-btn--primary">
              {busy ? "..." : "Find"}
            </button>
          </form>
        ) : (
          <form onSubmit={submit}>
            <div className="cz-summary" style={{ marginBottom: 18 }}>
              <h4>{g.name}</h4>
              <p className="cz-hint">
                Age {age(g.dateOfBirth)} · {g.gender} · DOB{" "}
                {new Date(g.dateOfBirth).toLocaleDateString("en-GB")}
              </p>
              <p className="cz-hint">
                {g.email}
                {g.phone ? ` · ${g.phone}` : ""}
              </p>
              <p className="cz-hint">
                <b>{a.vaccine}</b> · Dose {a.doseNumber} · {a.bookingCode}
              </p>
              <p className="cz-hint">
                {new Date(a.dateTime).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} · Status:{" "}
                <b>{a.status}</b>
              </p>
            </div>

            {blocked ? (
              <div className="cz-note cz-note--amber">
                This appointment is {a.alreadyVaccinated ? "already vaccinated" : a.status.toLowerCase()}.
                No further action is needed.
              </div>
            ) : (
              <>
                <div className="cz-form-grid">
                  <div className="cz-field">
                    <label className="cz-label">Photo ID type</label>
                    <select className="cz-select" value={idType} onChange={(e) => setIdType(e.target.value)}>
                      {ID_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cz-field">
                    <label className="cz-label">ID number</label>
                    <input
                      className="cz-input"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      minLength={4}
                    />
                    <p className="cz-hint">Only the last 4 characters are saved.</p>
                  </div>
                </div>

                <div className="cz-field">
                  <label className="cz-label">Vaccine batch</label>
                  {data.batches.length === 0 ? (
                    <p className="cz-hint cz-hint--error">No in-date stock for this vaccine at your clinic.</p>
                  ) : (
                    <select className="cz-select" value={batch} onChange={(e) => setBatch(e.target.value)} required>
                      {data.batches.map((b) => (
                        <option key={b.batchNumber} value={b.batchNumber}>
                          {b.batchNumber} — {b.quantity} left · exp{" "}
                          {new Date(b.expiryDate).toLocaleDateString("en-GB")}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <label className="cz-check">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
                  <span>I checked the photo ID and it matches the name and date of birth above.</span>
                </label>

                <button
                  type="submit"
                  disabled={busy || !checked || !batch}
                  className="cz-btn cz-btn--primary cz-btn--block"
                >
                  {busy ? "Saving..." : "Verify identity & log dose"}
                </button>
              </>
            )}

            <button type="button" onClick={reset} className="cz-btn cz-btn--ghost cz-btn--block" style={{ marginTop: 10 }}>
              Search another ID
            </button>
          </form>
        )}
      </section>
    </>
  );
}
