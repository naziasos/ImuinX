
import React, { useEffect, useState } from "react";
import "./WorkerAppointments.css";

function WorkerAppointments({
  onBack,
  onLogDose,
  onShowWork,
  onLogout,
}) {
  const [appointments, setAppointments] = useState([]);
  const [dutyAssigned, setDutyAssigned] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [completing, setCompleting] = useState(false);

  const [filter, setFilter] = useState("upcoming");
  const [selectedDate, setSelectedDate] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getToday();

  const patientName = (appointment) =>
    appointment?.familyProfileId?.name ||
    appointment?.guestProfileId?.name ||
    appointment?.citizenId?.name ||
    "Unknown Citizen";

  const patientSubtitle = (appointment) =>
    appointment?.familyProfileId
      ? `${appointment.familyProfileId.relationship || "Family member"} of ${
          appointment.citizenId?.name || "guardian"
        }`
      : appointment?.guestProfileId
      ? `Campaign guest · ID ${appointment.bookingCode} · use Campaign Check-in`
      : appointment?.citizenId?.email || "No email available";

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const fetchAppointments = async (
    currentFilter = filter,
    currentDate = selectedDate
  ) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      let url =
        "http://localhost:5000/api/worker-appointments/today";

      if (currentFilter === "today") {
        url += `?date=${today}`;
      } else if (currentFilter === "date") {
        if (!currentDate) {
          setAppointments([]);
          setDutyAssigned(false);
          setLoading(false);
          return;
        }

        url += `?date=${encodeURIComponent(currentDate)}`;
      }

      // "upcoming" intentionally sends no date parameter.
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load appointments");
      }

      setAppointments(data.appointments || []);
      setDutyAssigned(Boolean(data.dutyAssigned));
    } catch (err) {
      setError(err.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(filter, selectedDate);
    // Initial load only; filter changes are handled separately below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (newFilter) => {
    setFilter(newFilter);

    if (newFilter === "date") {
      if (selectedDate) {
        fetchAppointments("date", selectedDate);
      } else {
        setAppointments([]);
        setError("");
      }
      return;
    }

    fetchAppointments(newFilter, selectedDate);
  };

  const changeSelectedDate = (newDate) => {
    setSelectedDate(newDate);

    if (filter === "date" && newDate) {
      fetchAppointments("date", newDate);
    }
  };

  const openAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setError("");
  };

  const closeModal = () => {
    if (completing) return;
    setSelectedAppointment(null);
  };

  const completeAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setCompleting(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/worker-appointments/${selectedAppointment._id}/complete`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete appointment");
      }

      const completedAppointment = selectedAppointment;
      setSelectedAppointment(null);

      await fetchAppointments(filter, selectedDate);

      alert(
        "Appointment completed successfully. Now log the administered dose."
      );

      if (onLogDose) {
        onLogDose(completedAppointment);
      }
    } catch (err) {
      setError(err.message || "Failed to complete appointment");
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

  const pageTitle =
    filter === "upcoming"
      ? "All Upcoming Appointments"
      : filter === "today"
      ? "Today's Appointments"
      : "Appointments by Date";

  const sectionTitle =
    filter === "upcoming"
      ? "UPCOMING SCHEDULE"
      : filter === "today"
      ? "TODAY'S SCHEDULE"
      : "SELECTED DATE SCHEDULE";

  const emptyTitle =
    filter === "upcoming"
      ? "No upcoming appointments"
      : filter === "today"
      ? "No appointments for today"
      : "No appointments for this date";

  const emptyDescription =
    filter === "upcoming"
      ? "No upcoming appointments are currently assigned to you."
      : filter === "today"
      ? "No appointments are currently assigned to you for today."
      : "No appointments are assigned to you on the selected date.";

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

            <button className="worker-nav-item" onClick={onBack}>
              <span>📊</span>
              Dashboard
            </button>

            <button className="worker-nav-item active">
              <span>📅</span>
              Appointments
            </button>

            <button className="worker-nav-item" onClick={onLogDose}>
              <span>💉</span>
              Log Dose
            </button>

            <button className="worker-nav-item" onClick={onShowWork}>
              <span>📋</span>
              Show Work
            </button>

            <p className="worker-nav-title worker-system-title">SYSTEM</p>

            <button className="worker-nav-item">
              <span>⚙️</span>
              Settings
            </button>
          </nav>
        </div>

        <button className="worker-logout" onClick={handleLogout}>
          <span>↪</span>
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="worker-main">
        <header className="worker-header">
          <div>
            <p className="worker-breadcrumb">Dashboard / Appointments</p>

            <h1>{pageTitle}</h1>

            <p className="worker-description">
              View and process appointments assigned specifically to you.
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
          <div className="worker-error">{error}</div>
        )}

        {/* FILTERS */}
        <section className="appointment-section">
          <div className="appointment-section-header">
            <div>
              <p className="section-label">APPOINTMENT FILTERS</p>
              <h2>Find Appointments</h2>
              <p>Choose which assigned appointments you want to view.</p>
            </div>

            <button
              className="refresh-btn"
              onClick={() => fetchAppointments(filter, selectedDate)}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              className="refresh-btn"
              onClick={() => changeFilter("upcoming")}
              disabled={filter === "upcoming"}
            >
              All Upcoming
            </button>

            <button
              type="button"
              className="refresh-btn"
              onClick={() => changeFilter("today")}
              disabled={filter === "today"}
            >
              Today
            </button>

            <button
              type="button"
              className="refresh-btn"
              onClick={() => changeFilter("date")}
              disabled={filter === "date"}
            >
              Select Date
            </button>

            {filter === "date" && (
              <input
                type="date"
                value={selectedDate}
                min={today}
                onChange={(event) => changeSelectedDate(event.target.value)}
                aria-label="Filter appointments by date"
                style={{
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                }}
              />
            )}
          </div>

          {filter === "date" && !selectedDate && (
            <p>Please select a date to view appointments.</p>
          )}

          <div className="worker-top-section">
            <div className="worker-date-card">
              <div className="worker-date-icon">📅</div>
              <div>
                <span>
                  {filter === "upcoming"
                    ? "FROM TODAY ONWARD"
                    : filter === "today"
                    ? "TODAY"
                    : "SELECTED DATE"}
                </span>
                <h2>
                  {filter === "upcoming"
                    ? "All upcoming dates"
                    : filter === "today"
                    ? formatDate(new Date())
                    : selectedDate
                    ? formatDate(`${selectedDate}T12:00:00`)
                    : "Choose a date"}
                </h2>
              </div>
            </div>

            <div className="worker-count-card">
              <div>
                <span>ASSIGNED APPOINTMENTS</span>
                <strong>{appointments.length}</strong>
              </div>
            </div>
          </div>

          {filter === "today" && !dutyAssigned && (
            <div className="worker-duty-warning">
              <div className="warning-icon">⚠️</div>
              <div>
                <strong>No vaccination duty assigned today</strong>
                <p>
                  You have no vaccination duty recorded for today. Any
                  appointments already assigned to you will still be shown.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="worker-appointments-loading">
              <div className="worker-spinner"></div>
              <p>Loading appointments...</p>
            </div>
          ) : (
            <section className="appointment-section">
              <div className="appointment-section-header">
                <div>
                  <p className="section-label">{sectionTitle}</p>
                  <h2>Appointments</h2>
                  <p>
                    Showing appointments assigned to your worker account.
                  </p>
                </div>
              </div>

              {appointments.length === 0 ? (
                <div className="appointment-empty">
                  <div className="empty-calendar">📅</div>
                  <h3>{emptyTitle}</h3>
                  <p>{emptyDescription}</p>
                </div>
              ) : (
                <div className="appointment-list">
                  {appointments.map((appointment) => (
                    <div
                      className="appointment-card"
                      key={appointment._id}
                    >
                      <div className="appointment-time">
                        <strong>{formatTime(appointment.dateTime)}</strong>
                        <span>{formatDate(appointment.dateTime)}</span>
                      </div>

                      <div className="appointment-divider"></div>

                      <div className="appointment-citizen">
                        <div className="citizen-avatar">
                          {patientName(appointment).charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <h3>{patientName(appointment)}</h3>
                          <p>{patientSubtitle(appointment)}</p>
                          <p>
                            Vaccine:{" "}
                            {appointment.vaccineId?.name || "Not available"}
                          </p>
                        </div>
                      </div>

                      <div className="appointment-status">
                        <span>{appointment.status || "Confirmed"}</span>
                      </div>

                      {appointment.status === "Confirmed" && (
                        <button
                          className="process-btn"
                          onClick={() => openAppointment(appointment)}
                        >
                          Process
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
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
                <h2>Administer Vaccine</h2>
              </div>

              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="patient-box">
              <div className="patient-avatar">
                {patientName(selectedAppointment).charAt(0).toUpperCase()}
              </div>

              <div>
                <span>
                  {selectedAppointment.familyProfileId
                    ? "Family Member"
                    : "Citizen"}
                </span>

                <strong>{patientName(selectedAppointment)}</strong>
                <small>{formatDate(selectedAppointment.dateTime)}</small>
                <small>{formatTime(selectedAppointment.dateTime)}</small>
                <small>
                  Vaccine: {selectedAppointment.vaccineId?.name || "Not available"}
                </small>
              </div>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <div className="form-field">
              <label>Appointment Status</label>
              <div className="patient-box">
                <div>
                  <strong>{selectedAppointment.status}</strong>
                  <small>
                    Mark the appointment completed after administering the
                    vaccine.
                  </small>
                </div>
              </div>
            </div>

            <div className="modal-info">
              <span>✓</span>
              <p>
                After completing the appointment, you can log the administered
                dose. Inventory and certificate processing remain in Log Dose.
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
                  : "✓ Mark Appointment Completed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerAppointments;
