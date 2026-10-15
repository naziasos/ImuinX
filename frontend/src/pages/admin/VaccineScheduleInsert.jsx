
import { useEffect, useState } from "react";

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
    <div className="mx-auto max-w-2xl p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 rounded border px-4 py-2"
      >
        ← Back
      </button>

      <h1 className="mb-6 text-2xl font-bold">
        Manage Vaccine Schedules
      </h1>

      {message && (
        <p
          role="status"
          className="mb-4 rounded bg-gray-100 p-3"
        >
          {message}
        </p>
      )}

      {/* Schedule creation form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">
          Add Vaccine Schedule
        </h2>

        <div>
          <label className="mb-1 block">Vaccine *</label>

          <select
            value={vaccineId}
            onChange={(e) => setVaccineId(e.target.value)}
            required
            className="w-full rounded border p-2"
          >
            <option value="">Select a vaccine</option>

            {vaccines.map((vaccine) => (
              <option key={vaccine._id} value={vaccine._id}>
                {vaccine.name} ({vaccine.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block">
            Minimum age (days) *
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={minAgeDays}
            onChange={(e) => setMinAgeDays(e.target.value)}
            required
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block">
            Maximum age (days, optional)
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={maxAgeDays}
            onChange={(e) => setMaxAgeDays(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <h3 className="mb-2 font-semibold">Doses</h3>

          {doses.map((dose, index) => (
            <div key={index} className="mb-3 rounded border p-3">
              <p className="mb-2 font-medium">
                Dose {dose.doseNumber}
              </p>

              <label className="mb-1 block">
                Minimum interval (days)
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={dose.minIntervalDays}
                onChange={(e) =>
                  updateDose(
                    index,
                    "minIntervalDays",
                    e.target.value
                  )
                }
                placeholder="Optional"
                className="w-full rounded border p-2"
              />

              {doses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDose(index)}
                  className="mt-2 text-red-600"
                >
                  Remove dose
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addDose}
            className="rounded border px-4 py-2"
          >
            + Add Dose
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Schedule"}
        </button>
      </form>

      {/* Existing schedules */}
      <div className="mt-10 border-t pt-6">
        <h2 className="mb-4 text-xl font-bold">
          Existing Vaccine Schedules
        </h2>

        {scheduleLoading ? (
          <p>Loading schedules...</p>
        ) : schedules.length === 0 ? (
          <p>No vaccine schedules found.</p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule._id}
                className="rounded-lg border p-4"
              >
                <h3 className="font-semibold">
                  {schedule.vaccineId?.name || "Unknown vaccine"}
                  {schedule.vaccineId?.code
                    ? ` (${schedule.vaccineId.code})`
                    : ""}
                </h3>

                <p className="mt-2 text-sm">
                  Minimum age: {schedule.minAgeDays} days
                </p>

                <p className="text-sm">
                  Maximum age:{" "}
                  {schedule.maxAgeDays == null
                    ? "Not specified"
                    : `${schedule.maxAgeDays} days`}
                </p>

                <div className="mt-3">
                  <p className="font-medium">Doses</p>

                  {schedule.doses?.map((dose) => (
                    <p
                      key={dose._id || dose.doseNumber}
                      className="text-sm"
                    >
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
      </div>
    </div>
  );
}
