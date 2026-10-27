
import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Icon from "../../components/Icons";

const API_URL = "http://localhost:5000/api";

export default function VaccineScheduleInsert({ onBack }) {
  const [vaccines, setVaccines] = useState([]);
  const [vaccineId, setVaccineId] = useState("");
  const [minAgeDays, setMinAgeDays] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState("");

  const [doses, setDoses] = useState([
    { doseNumber: 1, minIntervalDays: "" },
  ]);

  const [schedules, setSchedules] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  // Load vaccine catalogue
  useEffect(() => {
    async function loadVaccines() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(`${API_URL}/vaccines`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load vaccines.");
        }

        setVaccines(
          Array.isArray(data) ? data : data.vaccines || []
        );
      } catch (error) {
        setMessage(error.message || "Could not load vaccines.");
      }
    }

    loadVaccines();
  }, []);

  // Load existing schedules
  async function loadSchedules() {
    try {
      setScheduleLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(`${API_URL}/vaccine-schedules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load schedules.");
      }

      setSchedules(data.schedules || []);
    } catch (error) {
      setMessage(error.message || "Could not load schedules.");
    } finally {
      setScheduleLoading(false);
    }
  }

  useEffect(() => {
    loadSchedules();
  }, []);

  function updateDose(index, field, value) {
    setDoses((previous) =>
      previous.map((dose, i) =>
        i === index ? { ...dose, [field]: value } : dose
      )
    );
  }

  function addDose() {
    setDoses((previous) => [
      ...previous,
      {
        doseNumber: previous.length + 1,
        minIntervalDays: "",
      },
    ]);
  }

  function removeDose(index) {
    setDoses((previous) =>
      previous
        .filter((_, i) => i !== index)
        .map((dose, i) => ({
          ...dose,
          doseNumber: i + 1,
        }))
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const minAge = Number(minAgeDays);
    const maxAge = maxAgeDays === "" ? null : Number(maxAgeDays);

    if (
      !vaccineId ||
      minAgeDays === "" ||
      !Number.isInteger(minAge) ||
      minAge < 0 ||
      (maxAge !== null &&
        (!Number.isInteger(maxAge) || maxAge < minAge)) ||
      doses.length === 0
    ) {
      setMessage("Please enter valid schedule information.");
      return;
    }

    const payload = {
      vaccineId,
      minAgeDays: minAge,
      maxAgeDays: maxAge,
      doses: doses.map((dose) => ({
        doseNumber: Number(dose.doseNumber),
        minIntervalDays:
          dose.minIntervalDays === ""
            ? null
            : Number(dose.minIntervalDays),
      })),
    };

    if (
      payload.doses.some(
        (dose) =>
          !Number.isInteger(dose.doseNumber) ||
          dose.doseNumber < 1 ||
          (dose.minIntervalDays !== null &&
            (!Number.isInteger(dose.minIntervalDays) ||
              dose.minIntervalDays < 0))
      )
    ) {
      setMessage("Please enter valid dose numbers and intervals.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(`${API_URL}/vaccine-schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save schedule.");
      }

      setMessage("Vaccine schedule saved successfully!");

      setVaccineId("");
      setMinAgeDays("");
      setMaxAgeDays("");
      setDoses([{ doseNumber: 1, minIntervalDays: "" }]);

      await loadSchedules();
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        icon="calendar"
        eyebrow="Vaccination"
        title="Manage Vaccine Schedules"
        description="Define the age window and dose intervals for each vaccine."
        
      />

      {message && (
        <p role="status" className="cz-alert cz-alert--info">
          {message}
        </p>
      )}

      <div className="cz-stack">
        {/* Schedule creation form */}
        <form onSubmit={handleSubmit} className="cz-card cz-form-card fx-rise" style={{ "--fx-i": 0 }}>
          <h2 className="cz-section-title">
            <span>
              <Icon name="plus" size={20} />
            </span>
            Add Vaccine Schedule
          </h2>

          <div className="cz-field">
            <label className="cz-label">Vaccine *</label>

            <select
              value={vaccineId}
              onChange={(e) => setVaccineId(e.target.value)}
              required
              className="cz-select"
            >
              <option value="">Select a vaccine</option>

              {vaccines.map((vaccine) => (
                <option key={vaccine._id} value={vaccine._id}>
                  {vaccine.name} ({vaccine.code})
                </option>
              ))}
            </select>
          </div>

          <div className="cz-form-grid">
            <div className="cz-field">
              <label className="cz-label">Minimum age (days) *</label>

              <input
                type="number"
                min="0"
                step="1"
                value={minAgeDays}
                onChange={(e) => setMinAgeDays(e.target.value)}
                required
                className="cz-input"
              />
            </div>

            <div className="cz-field">
              <label className="cz-label">Maximum age (days, optional)</label>

              <input
                type="number"
                min="0"
                step="1"
                value={maxAgeDays}
                onChange={(e) => setMaxAgeDays(e.target.value)}
                className="cz-input"
              />
            </div>
          </div>

          <div className="cz-field">
            <h3 className="cz-label">Doses</h3>

            <div className="cz-request-list">
              {doses.map((dose, index) => (
                <div key={index} className="cz-item">
                  <p className="cz-label" style={{ margin: "0 0 10px" }}>
                    Dose {dose.doseNumber}
                  </p>

                  <label className="cz-hint" style={{ display: "block", marginBottom: 6 }}>
                    Minimum interval (days)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={dose.minIntervalDays}
                    onChange={(e) => updateDose(index, "minIntervalDays", e.target.value)}
                    placeholder="Optional"
                    className="cz-input"
                  />

                  {doses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDose(index)}
                      className="cz-link-btn"
                      style={{ marginTop: 10 }}
                    >
                      Remove dose
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={addDose} className="cz-btn cz-btn--secondary cz-btn--sm">
                <Icon name="plus" size={15} /> Add Dose
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="cz-btn cz-btn--primary cz-btn--block">
            {loading ? "Saving..." : "Save Schedule"}
          </button>
        </form>

        {/* Existing schedules */}
        <section className="cz-card fx-rise" style={{ "--fx-i": 1 }}>
          <div className="cz-card__head">
            <h2>Existing Vaccine Schedules</h2>
          </div>

          {scheduleLoading ? (
            <div className="cz-loading">
              <div className="cz-spinner" />
              <p>Loading schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <p className="cz-hint">No vaccine schedules found.</p>
          ) : (
            <div className="cz-request-list">
              {schedules.map((schedule) => (
                <div key={schedule._id} className="cz-item" data-tilt>
                  <div className="cz-item__top">
                    <h3>
                      {schedule.vaccineId?.name || "Unknown vaccine"}
                      {schedule.vaccineId?.code ? ` (${schedule.vaccineId.code})` : ""}
                    </h3>
                  </div>

                  <p className="cz-hint">Minimum age: {schedule.minAgeDays} days</p>

                  <p className="cz-hint">
                    Maximum age:{" "}
                    {schedule.maxAgeDays == null ? "Not specified" : `${schedule.maxAgeDays} days`}
                  </p>

                  <div style={{ marginTop: 12 }}>
                    <p className="cz-label" style={{ margin: "0 0 4px" }}>
                      Doses
                    </p>

                    {schedule.doses?.map((dose) => (
                      <p key={dose._id || dose.doseNumber} className="cz-hint">
                        Dose {dose.doseNumber} — Minimum interval:{" "}
                        {dose.minIntervalDays == null
                          ? "Not specified"
                          : `${dose.minIntervalDays} days`}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
