import React, { useEffect, useState } from "react";
import "./WorkerAppointments.css";

function WorkerAppointments({ onBack, onLogDose,onShowWork, onLogout,  }) {
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [dutyAssigned, setDutyAssigned] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [vaccineType, setVaccineType] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [completing, setCompleting] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const today = getToday();

      const response = await fetch(
        `http://localhost:5000/api/worker-appointments/today?date=${today}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load appointments");
      }

      setAppointments(data.appointments || []);
      setDutyAssigned(data.dutyAssigned || false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/worker-appointments/inventory",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory || []);
      }
    } catch (err) {
      console.error("Inventory error:", err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchInventory();
  }, []);

  const openAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setVaccineType("");
    setBatchNumber("");
    setError("");
  };

  const closeModal = () => {
    if (completing) return;

    setSelectedAppointment(null);
    setVaccineType("");
    setBatchNumber("");
  };

  const availableVaccines = [
    ...new Set(inventory.map((item) => item.vaccineType)),
  ];

  const availableBatches = inventory.filter(
    (item) => item.vaccineType === vaccineType
  );

  const completeAppointment = async () => {
    if (!vaccineType || !batchNumber) {
      setError("Please select vaccine type and batch number.");
      return;
    }

    try {
      setCompleting(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/worker-appointments/${selectedAppointment._id}/complete`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vaccineType,
            batchNumber,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete appointment");
      }

      setSelectedAppointment(null);
      setVaccineType("");
      setBatchNumber("");

      await fetchAppointments();
      await fetchInventory();

      alert("Appointment completed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="worker-appointments-loading">
        <div className="worker-spinner"></div>
        <p>Loading today's appointments...</p>
      </div>
    );
  }

  return (
    <div className="worker-appointments-page">

      {/* SIDEBAR */}
      <aside className="worker-sidebar">

        <div>
          <div className="worker-logo">
            <div className="worker-logo-icon">+</div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

          <nav className="worker-nav">

            <p className="worker-nav-title">MAIN MENU</p>

            <button
              className="worker-nav-item"
              onClick={onBack}
            >
              <span>📊</span>
              Dashboard
            </button>

            <button className="worker-nav-item active">
              <span>📅</span>
              Appointments
            </button>

            <button
              className="worker-nav-item"
              onClick={onLogDose}
            >
              <span>💉</span>
              Log Dose
            </button>

            <button
              className="worker-nav-item"
              onClick={onShowWork}
            >
              <span>📋</span>
              Show Work
            </button>

            <p className="worker-nav-title worker-system-title">
              SYSTEM
            </p>

            <button className="worker-nav-item">
              <span>⚙️</span>
              Settings
            </button>

          </nav>
        </div>

        <button
          className="worker-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>

      {/* MAIN CONTENT */}
      <main className="worker-main">

        <header className="worker-header">

          <div>
            <p className="worker-breadcrumb">
              Dashboard / Appointments
            </p>

            <h1>Today's Appointments</h1>

            <p className="worker-description">
              View and process appointments assigned to your clinic.
            </p>
          </div>

          <div className="worker-profile">
            <div className="worker-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "W"}
            </div>

            <div>
              <strong>{user?.name || "Worker"}</strong>
              <span>Health Worker</span>
            </div>
          </div>

        </header>

        {error && !selectedAppointment && (
          <div className="worker-error">
            {error}
          </div>
        )}

        {/* DATE + STATS */}
        <section className="worker-top-section">

          <div className="worker-date-card">
            <div className="worker-date-icon">📅</div>

            <div>
              <span>TODAY</span>
              <h2>{formatDate(new Date())}</h2>
            </div>
          </div>

          <div className="worker-count-card">
            <div>
              <span>CONFIRMED APPOINTMENTS</span>
              <strong>{appointments.length}</strong>
            </div>
          </div>

        </section>

        {/* DUTY WARNING */}
        {!dutyAssigned && (
          <div className="worker-duty-warning">
            <div className="warning-icon">⚠️</div>

            <div>
              <strong>No vaccination duty assigned today</strong>
              <p>
                You currently do not have vaccination duty for today.
              </p>
            </div>
          </div>
        )}

        {/* APPOINTMENTS */}
        <section className="appointment-section">

          <div className="appointment-section-header">

            <div>
              <p className="section-label">
                TODAY'S SCHEDULE
              </p>

              <h2>Appointments</h2>

              <p>
                Confirmed appointments assigned to your clinic.
              </p>
            </div>

            <button
              className="refresh-btn"
              onClick={() => {
                fetchAppointments();
                fetchInventory();
              }}
            >
              ↻ Refresh
            </button>

          </div>

          {appointments.length === 0 ? (

            <div className="appointment-empty">

              <div className="empty-calendar">
                📅
              </div>

              <h3>No appointments for today</h3>

              <p>
                There are currently no confirmed appointments assigned
                to your clinic.
              </p>

            </div>

          ) : (

            <div className="appointment-list">

              {appointments.map((appointment) => (

                <div
                  className="appointment-card"
                  key={appointment._id}
                >

                  <div className="appointment-time">
                    <strong>
                      {formatTime(appointment.dateTime)}
                    </strong>

                    <span>Appointment</span>
                  </div>

                  <div className="appointment-divider"></div>

                  <div className="appointment-citizen">

                    <div className="citizen-avatar">
                      {appointment.citizenId?.name
                        ?.charAt(0)
                        ?.toUpperCase() || "C"}
                    </div>

                    <div>
                      <h3>
                        {appointment.citizenId?.name ||
                          "Unknown Citizen"}
                      </h3>

                      <p>
                        {appointment.citizenId?.email ||
                          "No email available"}
                      </p>
                    </div>

                  </div>

                  <div className="appointment-status">
                    <span>Confirmed</span>
                  </div>

                  <button
                    className="process-btn"
                    onClick={() => openAppointment(appointment)}
                  >
                    Process
                  </button>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

      {/* COMPLETION MODAL */}
      {selectedAppointment && (

        <div className="modal-overlay">

          <div className="completion-modal">

            <div className="modal-header">

              <div>
                <p>PROCESS APPOINTMENT</p>

                <h2>
                  Administer Vaccine
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <div className="patient-box">

              <div className="patient-avatar">
                {selectedAppointment.citizenId?.name
                  ?.charAt(0)
                  ?.toUpperCase() || "C"}
              </div>

              <div>
                <span>Citizen</span>
                <strong>
                  {selectedAppointment.citizenId?.name}
                </strong>

                <small>
                  {formatTime(selectedAppointment.dateTime)}
                </small>
              </div>

            </div>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            <div className="form-field">

              <label>Vaccine Type</label>

              <select
                value={vaccineType}
                onChange={(e) => {
                  setVaccineType(e.target.value);
                  setBatchNumber("");
                }}
              >
                <option value="">
                  Select vaccine
                </option>

                {availableVaccines.map((vaccine) => (
                  <option
                    key={vaccine}
                    value={vaccine}
                  >
                    {vaccine}
                  </option>
                ))}
              </select>

            </div>

            <div className="form-field">

              <label>Batch Number</label>

              <select
                value={batchNumber}
                onChange={(e) =>
                  setBatchNumber(e.target.value)
                }
                disabled={!vaccineType}
              >
                <option value="">
                  Select batch number
                </option>

                {availableBatches.map((item) => (
                  <option
                    key={item._id}
                    value={item.batchNumber}
                  >
                    {item.batchNumber} — {item.quantity} available
                  </option>
                ))}

              </select>

            </div>

            <div className="modal-info">
              <span>✓</span>
              <p>
                Completing this appointment will create the
                vaccination dose record automatically.
              </p>
            </div>

            <div className="modal-actions">

              <button
                className="cancel-modal-btn"
                onClick={closeModal}
                disabled={completing}
              >
                Cancel
              </button>

              <button
                className="complete-btn"
                onClick={completeAppointment}
                disabled={completing}
              >
                {completing
                  ? "Completing..."
                  : "✓ Complete Appointment"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default WorkerAppointments;