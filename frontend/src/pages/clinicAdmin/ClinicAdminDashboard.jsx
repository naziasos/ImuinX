import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import "./ClinicAdminDashboard.css";

function ClinicAdminDashboard({
  onLogout,
  onAddWorker,
  onWorkers,
  onOpenInventory,
  onAssignDuty,
  onFeedback,
  onEditProfile,
}) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [clinic, setClinic] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [feedbackSummary, setFeedbackSummary] = useState(null);

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

      // Load confirmed appointments for this clinic
      const appointmentResponse = await api.get(
        `/appointments/clinic/${clinicId}`
      );

      setAppointments(appointmentResponse.data.appointments || []);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    // Feedback numbers for the stat card + sidebar badge
    api
      .get("/feedback/clinic/summary")
      .then((res) => setFeedbackSummary(res.data.summary))
      .catch(() => { });
  }, []);
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

            <button
              className="clinic-nav-item"
              onClick={onEditProfile}
            >
              <span>👤</span>
              Edit Profile
            </button>
            
            <button
              className="clinic-nav-item"
              onClick={onAddWorker}
            >
              <span>👥</span>
              Add Worker
            </button>

            <button
              className="clinic-nav-item"
              onClick={onWorkers}
            >
              <span>👥</span>
              Workers List
            </button>

            



            <button
              className="clinic-nav-item"
              onClick={onAssignDuty}
            >
              <span>📝</span>
              Daily Duties
            </button>


            <button
              className="clinic-nav-item"
              onClick={onOpenInventory}
            >
              <span>📦</span>
              Inventory
            </button>

            <button
              className="clinic-nav-item"
              onClick={onFeedback}
            >
              <span>💬</span>
              Feedback
              {feedbackSummary?.newCount > 0 && (
                <em
                  style={{
                    marginLeft: "auto",
                    fontStyle: "normal",
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#2563eb",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  {feedbackSummary.newCount}
                </em>
              )}
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

          <div className="clinic-header-actions">

            <div className="clinic-profile">
            <div className="clinic-profile-avatar">
              C
            </div>

            <div>

              <strong>{user?.name || "Clinic Admin"}</strong>
              <span>Clinic Administrator</span>

            </div>
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

          <div
            className="clinic-stat-card clinic-stat-card-clickable"
            onClick={onWorkers}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onWorkers();
            }}
          >
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

          <div
            className="clinic-stat-card"
            onClick={onFeedback}
            style={{ cursor: "pointer" }}
          >
            <div className="clinic-stat-icon">
              💬
            </div>

            <div>
              <p>Patient Feedback</p>
              <h2>{feedbackSummary ? feedbackSummary.total : "—"}</h2>
              <span>
                {feedbackSummary
                  ? `${feedbackSummary.total
                    ? `★ ${feedbackSummary.averageRating.toFixed(1)} avg · `
                    : ""
                  }${feedbackSummary.newCount} new · ${feedbackSummary.awaitingCitizen
                  } awaiting patient`
                  : "Loading…"}
              </span>
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}

export default ClinicAdminDashboard;