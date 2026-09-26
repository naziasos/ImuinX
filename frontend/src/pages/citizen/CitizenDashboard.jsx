import React from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";

function CitizenDashboard({ onFamilyAccount, onLogout }) {
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
              <span>💉</span>
              My Vaccinations
            </button>

            <button className="clinic-nav-item">
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item">
              <span>🪪</span>
              Vaccine Certificate
            </button>




            <button
              className="clinic-nav-item"
              onClick={onFamilyAccount}
            >
              <span>👨‍👩‍👧</span>
              Family Account
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
              Citizen Dashboard
            </h1>

            <p className="clinic-description">
              Track your vaccination progress and upcoming appointments.
            </p>
          </div>

          <div className="clinic-profile">
            <div className="clinic-profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "C"}
            </div>

            <div>
              <strong>{user?.name || "Citizen"}</strong>
              <span>Citizen</span>
            </div>
          </div>

        </header>

        {/* Statistics */}
        <section className="clinic-stats">

          <div className="clinic-stat-card">
            <div className="clinic-stat-icon">
              💉
            </div>

            <div>
              <p>Doses Received</p>
              <h2>0</h2>
              <span>
                No vaccination records yet
              </span>
            </div>
          </div>

          <div className="clinic-stat-card">
            <div className="clinic-stat-icon">
              📅
            </div>

            <div>
              <p>Upcoming Appointments</p>
              <h2>0</h2>
              <span>
                Nothing scheduled
              </span>
            </div>
          </div>

        </section>

        {/* Vaccination Records */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                MY RECORDS
              </p>

              <h2>
                Vaccination History
              </h2>

              <p>
                Your vaccination records will appear here once a clinic
                worker administers a dose.
              </p>
            </div>

          </div>

          <div className="empty-workers">

            <div className="empty-icon">
              💉
            </div>

            <h3>
              No vaccination records yet
            </h3>

            <p>
              Book an appointment at a nearby clinic to get started.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default CitizenDashboard;
