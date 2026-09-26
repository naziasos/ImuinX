import { useEffect, useRef, useState } from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";
import "./LogDose.css";

import { api, errorMessage } from "../../services/api";

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }

  if (years < 1) {
    const totalMonths =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());
    return `${Math.max(totalMonths, 0)} mo`;
  }

  return `${years} yr`;
}

function LogDose({ onBack, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // ----- Citizen search -----
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizenResults, setCitizenResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [doseHistory, setDoseHistory] = useState([]);

  // ----- Inventory / vaccine / batch -----
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [vaccineType, setVaccineType] = useState("");
  const [batchNumber, setBatchNumber] = useState("");

  // ----- Date -----
  const [dateAdministered, setDateAdministered] = useState(todayISO());

  // ----- Form state -----
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(null);

  const heroRef = useRef(null);

  // Load clinic inventory once
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoadingInventory(true);
        const res = await api.get("/vaccine-inventory/my-clinic");
        setInventory(res.data.inventory || []);
      } catch (err) {
        setApiError(errorMessage(err));
      } finally {
        setLoadingInventory(false);
      }
    };

    loadInventory();
  }, []);

  // Debounced citizen search
  useEffect(() => {
    if (citizenQuery.trim().length < 2) {
      setCitizenResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get("/family/search", {
          params: { query: citizenQuery.trim() },
        });
        setCitizenResults(res.data.citizens || []);
      } catch (err) {
        setCitizenResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [citizenQuery]);

  const selectCitizen = async (citizen) => {
    setSelectedCitizen(citizen);
    setCitizenQuery(citizen.name);
    setShowResults(false);
    setErrors((prev) => ({ ...prev, citizen: undefined }));

    try {
      const res = await api.get(`/doses/citizen/${citizen._id}`);
      setDoseHistory(res.data.doses || []);
    } catch (err) {
      setDoseHistory([]);
    }
  };

  const clearCitizen = () => {
    setSelectedCitizen(null);
    setCitizenQuery("");
    setDoseHistory([]);
  };

  // Available vaccine types with usable stock
  const usableInventory = inventory.filter(
    (item) =>
      item.quantity > 0 && new Date(item.expiryDate) >= new Date()
  );

  const vaccineTypes = [
    ...new Set(usableInventory.map((item) => item.vaccineType)),
  ];

  const availableBatches = usableInventory.filter(
    (item) => item.vaccineType === vaccineType
  );

  const selectedBatchInfo = availableBatches.find(
    (b) => b.batchNumber === batchNumber
  );

  const handleVaccineSelect = (type) => {
    setVaccineType(type);
    setBatchNumber("");
    setErrors((prev) => ({ ...prev, vaccineType: undefined, batchNumber: undefined }));
  };

  const handleBatchSelect = (num) => {
    setBatchNumber(num);
    setErrors((prev) => ({ ...prev, batchNumber: undefined }));
  };

  const handleDateChange = (e) => {
    setDateAdministered(e.target.value);
    setErrors((prev) => ({ ...prev, dateAdministered: undefined }));
  };

  const validate = () => {
    const next = {};

    if (!selectedCitizen) {
      next.citizen = "Select a citizen to log this dose for.";
    }

    if (!vaccineType) {
      next.vaccineType = "Choose a vaccine.";
    }

    if (!batchNumber) {
      next.batchNumber = "Choose a batch.";
    }

    if (!dateAdministered) {
      next.dateAdministered = "Select the date the dose was given.";
    } else {
      const chosen = new Date(dateAdministered);
      const today = new Date(todayISO());

      if (isNaN(chosen.getTime())) {
        next.dateAdministered = "That date isn't valid.";
      } else if (chosen > today) {
        next.dateAdministered = "Date can't be in the future.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    clearCitizen();
    setVaccineType("");
    setBatchNumber("");
    setDateAdministered(todayISO());
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    try {
      setSubmitting(true);

      const res = await api.post("/doses", {
        citizenId: selectedCitizen._id,
        vaccineType,
        batchNumber,
        dateAdministered,
      });

      setSuccess({
        citizenName: selectedCitizen.name,
        vaccineType,
        batchNumber,
        date: dateAdministered,
        message: res.data.message,
      });

      // refresh inventory so the batch quantity reflects the dose taken
      const inv = await api.get("/vaccine-inventory/my-clinic");
      setInventory(inv.data.inventory || []);
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  // subtle pointer-driven 3D tilt on the hero banner
  const handleHeroMove = (e) => {
    const el = heroRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    el.style.setProperty("--tiltX", `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty("--tiltY", `${(x * 8).toFixed(2)}deg`);
  };

  const handleHeroLeave = () => {
    const el = heroRef.current;
    if (!el) return;
    el.style.setProperty("--tiltX", `0deg`);
    el.style.setProperty("--tiltY", `0deg`);
  };

  const step1Done = !!selectedCitizen;
  const step2Done = !!vaccineType && !!batchNumber;
  const step3Done = !!dateAdministered && !errors.dateAdministered;

  return (
    <div className="clinic-dashboard">
      {/* Sidebar (consistent with the rest of the worker area) */}
      <aside className="clinic-sidebar">
        <div>
          <div className="clinic-logo">
            <div className="clinic-logo-icon">+</div>
            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

          <nav className="clinic-nav">
            <p className="clinic-nav-title">MAIN MENU</p>

            <button className="clinic-nav-item" onClick={onBack}>
              <span>📊</span>
              Dashboard
            </button>

            <button className="clinic-nav-item">
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item active">
              <span>💉</span>
              Log Dose
            </button>

            <p className="clinic-nav-title system-title">SYSTEM</p>

            <button className="clinic-nav-item">
              <span>⚙️</span>
              Settings
            </button>
          </nav>
        </div>

        <button
          className="clinic-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="clinic-main logdose-main">
        {/* Hero */}
        <div
          ref={heroRef}
          className="logdose-hero"
          onMouseMove={handleHeroMove}
          onMouseLeave={handleHeroLeave}
        >
          <div className="logdose-hero-glow" />

          <div className="logdose-hero-content">
            <p className="logdose-hero-eyebrow">HEALTH WORKER · {user?.name || "Worker"}</p>
            <h1>Log a Dose</h1>
            <p className="logdose-hero-sub">
              Record a vaccination against a citizen's profile in three quick steps.
            </p>
          </div>

          <div className="logdose-hero-badge">
            <div className="logdose-badge-face">💉</div>
          </div>
        </div>

        {/* Step rail */}
        <div className="logdose-rail">
          <div className={`logdose-rail-step ${step1Done ? "done" : "pending"}`}>
            <span className="logdose-rail-dot">{step1Done ? "✓" : "1"}</span>
            Citizen
          </div>
          <div className="logdose-rail-line" />
          <div className={`logdose-rail-step ${step2Done ? "done" : "pending"}`}>
            <span className="logdose-rail-dot">{step2Done ? "✓" : "2"}</span>
            Vaccine &amp; Batch
          </div>
          <div className="logdose-rail-line" />
          <div className={`logdose-rail-step ${step3Done ? "done" : "pending"}`}>
            <span className="logdose-rail-dot">{step3Done ? "✓" : "3"}</span>
            Date &amp; Confirm
          </div>
        </div>

        {apiError && (
          <div className="clinic-error logdose-alert">⚠ {apiError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="logdose-grid">
            {/* PANEL 1 — Citizen */}
            <div className="logdose-panel">
              <div className="logdose-panel-inner">
                <div className="logdose-panel-head">
                  <span className="logdose-panel-icon">🧑‍🤝‍🧑</span>
                  <div>
                    <h3>Select Citizen</h3>
                    <p>Search by the citizen's registered name.</p>
                  </div>
                </div>

                {!selectedCitizen ? (
                  <div className="logdose-search">
                    <input
                      type="text"
                      className={`logdose-input ${errors.citizen ? "has-error" : ""}`}
                      placeholder="Type at least 2 letters of the name…"
                      value={citizenQuery}
                      onChange={(e) => {
                        setCitizenQuery(e.target.value);
                        setShowResults(true);
                      }}
                      onFocus={() => setShowResults(true)}
                    />

                    {showResults && citizenQuery.trim().length >= 2 && (
                      <div className="logdose-dropdown">
                        {searching && (
                          <div className="logdose-dropdown-empty">Searching…</div>
                        )}

                        {!searching && citizenResults.length === 0 && (
                          <div className="logdose-dropdown-empty">
                            No matching citizen found.
                          </div>
                        )}

                        {!searching &&
                          citizenResults.map((c) => (
                            <button
                              type="button"
                              key={c._id}
                              className="logdose-dropdown-item"
                              onClick={() => selectCitizen(c)}
                            >
                              <span className="logdose-dropdown-avatar">
                                {c.name?.charAt(0)?.toUpperCase()}
                              </span>
                              <span className="logdose-dropdown-text">
                                <strong>{c.name}</strong>
                                <span>
                                  {c.relationship} · {calcAge(c.dateOfBirth)}
                                  {c.guardianId?.name
                                    ? ` · Guardian: ${c.guardianId.name}`
                                    : ""}
                                </span>
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="logdose-selected-citizen">
                    <div className="logdose-citizen-avatar">
                      {selectedCitizen.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="logdose-citizen-info">
                      <strong>{selectedCitizen.name}</strong>
                      <span>
                        {selectedCitizen.relationship} ·{" "}
                        {calcAge(selectedCitizen.dateOfBirth)} old ·{" "}
                        {selectedCitizen.gender}
                      </span>
                      {selectedCitizen.guardianId?.name && (
                        <span className="logdose-citizen-guardian">
                          Guardian: {selectedCitizen.guardianId.name}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="logdose-chip-clear"
                      onClick={clearCitizen}
                    >
                      Change
                    </button>
                  </div>
                )}

                {errors.citizen && (
                  <p className="logdose-error-text">⚠ {errors.citizen}</p>
                )}

                {selectedCitizen && (
                  <div className="logdose-history">
                    <p className="logdose-history-title">
                      Previous doses ({doseHistory.length})
                    </p>

                    {doseHistory.length === 0 ? (
                      <p className="logdose-history-empty">
                        No prior doses on record.
                      </p>
                    ) : (
                      <ul>
                        {doseHistory.slice(0, 3).map((d) => (
                          <li key={d._id}>
                            <strong>{d.vaccineType}</strong>
                            <span>
                              {new Date(d.dateAdministered).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PANEL 2 — Vaccine & Batch */}
            <div className={`logdose-panel ${!step1Done ? "is-locked" : ""}`}>
              <div className="logdose-panel-inner">
                <div className="logdose-panel-head">
                  <span className="logdose-panel-icon">🧪</span>
                  <div>
                    <h3>Vaccine &amp; Batch</h3>
                    <p>Pulled live from your clinic's stock.</p>
                  </div>
                </div>

                {loadingInventory ? (
                  <p className="logdose-muted">Loading clinic stock…</p>
                ) : vaccineTypes.length === 0 ? (
                  <p className="logdose-muted">
                    No usable vaccine stock available in your clinic.
                  </p>
                ) : (
                  <>
                    <div className="logdose-chip-grid">
                      {vaccineTypes.map((type) => (
                        <button
                          type="button"
                          key={type}
                          className={`logdose-tile ${
                            vaccineType === type ? "active" : ""
                          }`}
                          onClick={() => handleVaccineSelect(type)}
                        >
                          <span className="logdose-tile-icon">💊</span>
                          {type}
                        </button>
                      ))}
                    </div>

                    {errors.vaccineType && (
                      <p className="logdose-error-text">⚠ {errors.vaccineType}</p>
                    )}

                    {vaccineType && (
                      <div className="logdose-batches">
                        <p className="logdose-history-title">Choose a batch</p>

                        <div className="logdose-batch-grid">
                          {availableBatches.map((b) => (
                            <button
                              type="button"
                              key={b._id}
                              className={`logdose-batch-card ${
                                batchNumber === b.batchNumber ? "active" : ""
                              }`}
                              onClick={() => handleBatchSelect(b.batchNumber)}
                            >
                              <strong>{b.batchNumber}</strong>
                              <span>{b.quantity} left</span>
                              <span className="logdose-batch-expiry">
                                Exp {new Date(b.expiryDate).toLocaleDateString()}
                              </span>
                            </button>
                          ))}
                        </div>

                        {errors.batchNumber && (
                          <p className="logdose-error-text">
                            ⚠ {errors.batchNumber}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* PANEL 3 — Date & confirm */}
            <div
              className={`logdose-panel ${
                !(step1Done && step2Done) ? "is-locked" : ""
              }`}
            >
              <div className="logdose-panel-inner">
                <div className="logdose-panel-head">
                  <span className="logdose-panel-icon">📅</span>
                  <div>
                    <h3>Date Administered</h3>
                    <p>Defaults to today. Can't be a future date.</p>
                  </div>
                </div>

                <input
                  type="date"
                  className={`logdose-input ${
                    errors.dateAdministered ? "has-error" : ""
                  }`}
                  value={dateAdministered}
                  max={todayISO()}
                  onChange={handleDateChange}
                />

                {errors.dateAdministered && (
                  <p className="logdose-error-text">
                    ⚠ {errors.dateAdministered}
                  </p>
                )}

                <div className="logdose-review">
                  <p className="logdose-history-title">Summary</p>

                  <div className="logdose-review-row">
                    <span>Citizen</span>
                    <strong>{selectedCitizen?.name || "—"}</strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>Vaccine</span>
                    <strong>{vaccineType || "—"}</strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>Batch</span>
                    <strong>{batchNumber || "—"}</strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>Stock left</span>
                    <strong>
                      {selectedBatchInfo ? `${selectedBatchInfo.quantity}` : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="logdose-submit-bar">
            <button
              type="button"
              className="logdose-btn-secondary"
              onClick={resetForm}
              disabled={submitting}
            >
              Clear form
            </button>

            <button
              type="submit"
              className="logdose-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Logging dose…" : "Log Dose"}
            </button>
          </div>
        </form>
      </main>

      {/* Success overlay */}
      {success && (
        <div className="logdose-overlay" role="dialog" aria-modal="true">
          <div className="logdose-success-card">
            <div className="logdose-stamp">✓</div>

            <h2>Dose Logged</h2>
            <p>{success.message || "The vaccination record was saved."}</p>

            <div className="logdose-success-details">
              <div>
                <span>Citizen</span>
                <strong>{success.citizenName}</strong>
              </div>
              <div>
                <span>Vaccine</span>
                <strong>{success.vaccineType}</strong>
              </div>
              <div>
                <span>Batch</span>
                <strong>{success.batchNumber}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{new Date(success.date).toLocaleDateString()}</strong>
              </div>
            </div>

            <div className="logdose-success-actions">
              <button
                className="logdose-btn-secondary"
                onClick={() => {
                  setSuccess(null);
                  resetForm();
                }}
              >
                Log another dose
              </button>

              <button
                className="logdose-btn-primary"
                onClick={() => {
                  setSuccess(null);
                  resetForm();
                  onBack && onBack();
                }}
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogDose;