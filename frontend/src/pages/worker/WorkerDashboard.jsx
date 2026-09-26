import React from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";

function WorkerDashboard({ onLogout, onLogDose }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

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
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item" onClick={onLogDose}>
              <span>💉</span>
              Log Dose
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
              Worker Dashboard
            </h1>

            <p className="clinic-description">
              View today's appointments and manage vaccinations for your
              clinic.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>

            <div className="clinic-profile">
              <div className="clinic-profile-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || "W"}
              </div>

              <div>
                <strong>{user?.name || "Worker"}</strong>
                <span>Health Worker</span>
              </div>
            </div>
          </div>

        </header>

        {/* Statistics */}
        <section className="clinic-stats">

          <div className="clinic-stat-card">
            <div className="clinic-stat-icon">
              📅
            </div>

            <div>
              <p>Today's Appointments</p>
              <h2>0</h2>
              <span>
                Nothing scheduled today
              </span>
            </div>
          </div>

          <div className="clinic-stat-card">
            <div className="clinic-stat-icon">
              💉
            </div>

            <div>
              <p>Doses Administered</p>
              <h2>0</h2>
              <span>
                No records yet
              </span>
            </div>
          </div>

        </section>

        {/* Appointments */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                SCHEDULE
              </p>

              <h2>
                Upcoming Appointments
              </h2>

              <p>
                Appointments assigned to you will appear here.
              </p>
            </div>

          </div>

          <div className="empty-workers">

            <div className="empty-icon">
              📅
            </div>

            <h3>
              No appointments yet
            </h3>

            <p>
              You're all caught up for now.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default WorkerDashboard;
