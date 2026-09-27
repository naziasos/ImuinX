import React, { useEffect, useState } from "react";
import "./ClinicAdminDashboard.css";

function ClinicAdminDashboard({ onLogout, onAddWorker, onOpenInventory, onAssignDuty}) {
  const [clinic, setClinic] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
const [appointmentLoading, setAppointmentLoading] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please login again.");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/workers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load dashboard"
        );
      }

      setClinic(data.clinic);
setWorkers(data.workers || []);

const clinicId = data.clinic?._id || data.clinic?.id;

if (!clinicId) {
  throw new Error("Clinic ID not found");
}

// Load pending appointments for this clinic
const appointmentResponse = await fetch(
  `http://localhost:5000/api/appointments/clinic/${clinicId}`
);

      const appointmentData = await appointmentResponse.json();

      if (!appointmentResponse.ok) {
        throw new Error(
          appointmentData.message || "Failed to load appointments"
        );
      }

      setAppointments(appointmentData.appointments || []);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);
const handleAppointmentAction = async (appointmentId, action) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/appointments/${appointmentId}/${action}`,
      {
        method: "PATCH",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to update appointment.");
      return;
    }

    alert(data.message);

    // Remove the appointment from Pending list
    setAppointments((prevAppointments) =>
      prevAppointments.filter(
        (appointment) => appointment._id !== appointmentId
      )
    );
  } catch (error) {
    console.error("Appointment action error:", error);
    alert("Something went wrong.");
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
      <div className="clinic-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your clinic dashboard...</p>
      </div>
    );
  }

  return (
    <div className="clinic-dashboard">

      {/* Sidebar */}
      <aside className="clinic-sidebar">

        <div>
          {/* Logo */}
          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="clinic-nav">

            <p className="clinic-nav-title">
              MAIN MENU
            </p>

            <button className="clinic-nav-item active">
              <span>📊</span>
              Dashboard
            </button>

            <button className="clinic-nav-item">
              <span>👥</span>
              Workers
            </button>

            <button className="clinic-nav-item">
              <span>📅</span>
              Appointments
            </button>



            <button
              className="clinic-nav-item"
              onClick={onAssignDuty}
            >
              <span>📝</span>
              Daily Duties
            </button>




            <button className="clinic-nav-item">
              <span>💉</span>
              Vaccinations
            </button>

            <button
              className="clinic-nav-item"
              onClick={onOpenInventory}
            >
              <span>📦</span>
              Inventory
            </button>

            <p className="clinic-nav-title system-title">
              SYSTEM
            </p>

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
      <main className="clinic-main">

        {/* Header */}
        <header className="clinic-header">

          <div>
            <p className="clinic-breadcrumb">
              Dashboard
            </p>

            <h1>
              Clinic Admin Dashboard
            </h1>

            <p className="clinic-description">
              Manage your clinic and view your assigned workers.
            </p>
          </div>

          <div className="clinic-profile">
            <div className="clinic-profile-avatar">
              C
            </div>

            <div>
              <strong>Clinic Admin</strong>
              <span>Administrator</span>
            </div>
          </div>

        </header>

        {/* Error */}
        {error && (
          <div className="clinic-error">
            {error}
          </div>
        )}

        {/* Clinic Information */}
        {clinic && (
          <section className="clinic-info-card">

            <div className="clinic-info-icon">
              🏥
            </div>

            <div className="clinic-info-content">
              <p>MY CLINIC</p>

              <h2>{clinic.name}</h2>

              <div className="clinic-details">
                <span>
                  📍 {clinic.location}
                </span>

                <span>
                  📞 {clinic.contact}
                </span>

                <span className="clinic-status">
                  ● {clinic.status}
                </span>
              </div>
            </div>

          </section>
        )}

        {/* Statistics */}
        <section className="clinic-stats">

          <div className="clinic-stat-card">
            <div className="clinic-stat-icon">
              👥
            </div>

            <div>
              <p>Total Workers</p>
              <h2>{workers.length}</h2>
              <span>
                Workers in your clinic
              </span>
            </div>
          </div>

          <div className="clinic-stat-card">
            <div className="clinic-stat-icon">
              🏥
            </div>

            <div>
              <p>Clinic Status</p>
              <h2>
                {clinic?.status || "—"}
              </h2>
              <span>
                Current clinic status
              </span>
            </div>
          </div>

        </section>
{/* Pending Appointments */}
<section className="workers-section">

  <div className="workers-header">

    <div>
      <p className="section-label">
        APPOINTMENTS
      </p>

      <h2>
        Pending Appointments
      </h2>

      <p>
        Appointments waiting for clinic approval.
      </p>
    </div>

    <div className="worker-count">
      {appointments.length} Appointment
      {appointments.length !== 1 ? "s" : ""}
    </div>

  </div>

  {appointmentLoading ? (

    <div className="empty-workers">
      <p>Loading appointments...</p>
    </div>

  ) : appointments.length === 0 ? (

    <div className="empty-workers">

      <div className="empty-icon">
        📅
      </div>

      <h3>
        No pending appointments
      </h3>

      <p>
        New appointment requests will appear here.
      </p>

    </div>

  ) : (

    <div className="workers-grid">

      {appointments.map((appointment) => (

        <div
          className="worker-card"
          key={appointment._id}
        >

          <div className="worker-avatar">
            {appointment.citizenId?.name
              ?.charAt(0)
              ?.toUpperCase()}
          </div>

          <div className="worker-info">

            <h3>
              {appointment.citizenId?.name || "Unknown Citizen"}
            </h3>

            <p>
              {appointment.citizenId?.email || "No email"}
            </p>

            <span className="worker-role">
              {new Date(appointment.dateTime).toLocaleDateString()}
              {" • "}
              {new Date(appointment.dateTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>


          </div>

          <span className="worker-role">
            Pending
          </span>
          <div className="appointment-actions">
  <button
    type="button"
    className="approve-btn"
    onClick={() =>
      handleAppointmentAction(appointment._id, "approve")
    }
  >
    Approve
  </button>

  <button
    type="button"
    className="reject-btn"
    onClick={() =>
      handleAppointmentAction(appointment._id, "reject")
    }
  >
    Reject
  </button>
</div>

        </div>

      ))}

    </div>

  )}

</section>
        {/* Workers */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                CLINIC TEAM
              </p>

              <h2>
                Workers
              </h2>

              <p>
                Workers currently assigned to your clinic.
              </p>
            </div>

            <div>
              {/* YOUR ADDITION: Add Worker button */}
              <button
                onClick={onAddWorker}
                className="add-worker-btn"
              >
                + Add Worker
              </button>

              <div className="worker-count">
                {workers.length} Worker
                {workers.length !== 1 ? "s" : ""}
              </div>
            </div>

          </div>

          {workers.length === 0 ? (

            <div className="empty-workers">

              <div className="empty-icon">
                👥
              </div>

              <h3>
                No workers assigned yet
              </h3>

              <p>
                Workers assigned to this clinic will
                appear here.
              </p>

            </div>

          ) : (

            <div className="workers-grid">

              {workers.map((worker) => (

                <div
                  className="worker-card"
                  key={worker._id}
                >

                  <div className="worker-avatar">
                    {worker.name
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </div>

                  <div className="worker-info">

                    <h3>
                      {worker.name}
                    </h3>

                    <p>
                      {worker.email}
                    </p>

                    <span className="worker-role">
                      Health Worker
                    </span>

                  </div>

                  <button
                    className="worker-more"
                    type="button"
                  >
                    ⋮
                  </button>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default ClinicAdminDashboard;