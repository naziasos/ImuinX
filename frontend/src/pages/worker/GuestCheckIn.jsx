import { useState } from "react";
import { api, errorMessage } from "../../services/api";

const ID_TYPES = ["National ID", "Birth Registration", "Passport", "Driving License", "Other"];

const field =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

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
    <div className="max-w-xl mx-auto my-10 p-8 bg-white rounded-2xl shadow-lg">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-600 mb-4">
        ← Back to Dashboard
      </button>

      <h2 className="text-2xl font-extrabold text-slate-800">Campaign check-in</h2>
      <p className="text-sm text-slate-500 mt-1">
        Enter the guest's Appointment ID, check their photo ID, then log the dose.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3" role="alert">
          {error}
        </div>
      )}

      {done ? (
        <div className="mt-6 text-center">
          <div className="text-5xl mb-2">✅</div>
          <p className="font-semibold text-slate-800">{done}</p>
          <p className="text-sm text-slate-500 mt-1">The guest was emailed how to get the certificate.</p>
          <button
            onClick={reset}
            className="mt-5 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold"
          >
            Check in next guest
          </button>
        </div>
      ) : !data ? (
        <form onSubmit={lookup} className="mt-5 flex gap-2">
          <input
            className={`${field} uppercase tracking-widest font-bold`}
            placeholder="IMX-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="px-5 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
          >
            {busy ? "..." : "Find"}
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm space-y-1">
            <p className="text-lg font-bold text-slate-800">{g.name}</p>
            <p>
              Age {age(g.dateOfBirth)} · {g.gender} · DOB{" "}
              {new Date(g.dateOfBirth).toLocaleDateString("en-GB")}
            </p>
            <p>{g.email}{g.phone ? ` · ${g.phone}` : ""}</p>
            <p>
              <b>{a.vaccine}</b> · Dose {a.doseNumber} · {a.bookingCode}
            </p>
            <p>
              {new Date(a.dateTime).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} ·{" "}
              Status: <b>{a.status}</b>
            </p>
          </div>

          {blocked ? (
            <div className="rounded-xl bg-amber-50 text-amber-800 text-sm px-4 py-3">
              This appointment is {a.alreadyVaccinated ? "already vaccinated" : a.status.toLowerCase()}.
              No further action is needed.
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Photo ID type</label>
                  <select className={field} value={idType} onChange={(e) => setIdType(e.target.value)}>
                    {ID_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ID number</label>
                  <input
                    className={field}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    required
                    minLength={4}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Only the last 4 characters are saved.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vaccine batch</label>
                {data.batches.length === 0 ? (
                  <p className="text-sm text-rose-600">No in-date stock for this vaccine at your clinic.</p>
                ) : (
                  <select className={field} value={batch} onChange={(e) => setBatch(e.target.value)} required>
                    {data.batches.map((b) => (
                      <option key={b.batchNumber} value={b.batchNumber}>
                        {b.batchNumber} — {b.quantity} left · exp{" "}
                        {new Date(b.expiryDate).toLocaleDateString("en-GB")}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
                I checked the photo ID and it matches the name and date of birth above.
              </label>

              <button
                type="submit"
                disabled={busy || !checked || !batch}
                className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold disabled:opacity-50"
              >
                {busy ? "Saving..." : "Verify identity & log dose"}
              </button>
            </>
          )}

          <button type="button" onClick={reset} className="w-full text-sm font-semibold text-slate-500">
            Search another ID
          </button>
        </form>
      )}
    </div>
  );
}
