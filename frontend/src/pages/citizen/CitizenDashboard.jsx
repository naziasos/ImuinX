import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import "../clinicAdmin/ClinicAdminDashboard.css";

function CitizenDashboard({onFamilyAccount,onAppointments,onCertificate,onVaccinations, onFeedback,onLogout}) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [pendingFeedback, setPendingFeedback] = useState(0);

  // Badge on the Feedback nav item: vaccinations still waiting for a review
  useEffect(() => {
    let active = true;
    api
      .get("/feedback/my-pending")
      .then((res) => {
        if (active) setPendingFeedback((res.data.feedback || []).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="clinic-dashboard">

      {}
      <aside className="clinic-sidebar">

        <div>
          {}
          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

          {}
          <nav className="clinic-nav">

            <p className="clinic-nav-title">
              MAIN MENU
            </p>

            <button className="clinic-nav-item active">
              <span>📊</span>
              Dashboard
            </button>

            <button className="clinic-nav-item"
             onClick={onVaccinations}
             >
              <span>💉</span>
              My Vaccinations
            </button>

            <button
              className="clinic-nav-item"
              onClick={onAppointments}
            >
              <span>📅</span>
              Appointments
            </button>
            <button
              className="clinic-nav-item"
              onClick={onCertificate}
            >
              <span>🪪</span>
              My Certificate
            </button>




            <button
              className="clinic-nav-item"
              onClick={onFamilyAccount}
            >
              <span>👨‍👩‍👧</span>
              Family Account
            </button>





            <button
              className="clinic-nav-item"
              onClick={onFeedback}
            >
              <span>💬</span>
              Feedback
              {pendingFeedback > 0 && (
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
                  {pendingFeedback}
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

      {}
      <main className="clinic-main">

        {}
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

        {}
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

        {}
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
