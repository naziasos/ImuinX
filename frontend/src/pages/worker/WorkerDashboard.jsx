import React, { useEffect, useState } from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";
import { api, errorMessage } from "../../services/api";

function WorkerDashboard({ onLogout, onLogDose, onShowWork,onAppointments, }) {
    const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestError, setRequestError] = useState("");

  const handleAcceptRequest = async (requestId) => {
  try {
    await api.patch(`/in-house-requests/${requestId}/accept`);

    setPendingRequests((prevRequests) =>
      prevRequests.filter((request) => request._id !== requestId)
    );
  } catch (error) {
    alert(errorMessage(error));
  }
};

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        setLoadingRequests(true);
        setRequestError("");

        const response = await api.get("/in-house-requests/pending");

      setPendingRequests(response.data?.data || []);
      } catch (error) {
        setRequestError(errorMessage(error));
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchPendingRequests();
  }, []);
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

            <button className="clinic-nav-item" onClick={onAppointments}>
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item" onClick={onLogDose}>
              <span>💉</span>
              Log Dose
            </button>


            <button
  className="clinic-nav-item"
  onClick={onShowWork}
>
  <span>📋</span>
  Show Work
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
                {/* Pending In-House Requests */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                IN-HOUSE SERVICE
              </p>

              <h2>
                Pending In-House Requests
              </h2>

              <p>
                Citizens waiting for a health worker to accept their request.
              </p>
            </div>

          </div>

          {loadingRequests ? (
            <div className="empty-workers">
              <div className="empty-icon">
                ⏳
              </div>

              <h3>
                Loading requests...
              </h3>

              <p>
                Please wait while we fetch pending requests.
              </p>
            </div>
          ) : requestError ? (
            <div className="empty-workers">
              <div className="empty-icon">
                ⚠️
              </div>

              <h3>
                Unable to load requests
              </h3>

              <p>
                {requestError}
              </p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="empty-workers">

              <div className="empty-icon">
                🏠
              </div>

              <h3>
                No pending requests
              </h3>

              <p>
                There are no in-house vaccination requests waiting for you.
              </p>

            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {pendingRequests.map((request) => (
                <div
                  key={request._id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "20px",
                    background: "#ffffff",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "20px",
                    }}
                  >

                    <div>
                      <h3 style={{ marginBottom: "8px" }}>
                        {request.citizen?.name || "Citizen"}
                      </h3>

                      <p>
                        <strong>Address:</strong>{" "}
                        {request.address || "Not provided"}
                      </p>

                      <p>
                        <strong>Preferred Date:</strong>{" "}
                        {request.preferredDate
                          ? new Date(request.preferredDate).toLocaleDateString()
                          : "Not specified"}
                      </p>

                      <p>
                        <strong>Vaccine / Reason:</strong>{" "}
                        {request.vaccineOrReason || "Not provided"}
                      </p>

                    </div>

                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        background: "#fff7ed",
                        color: "#c2410c",
                        fontSize: "13px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Pending
                    </span>

                  </div>

                  <div style={{ marginTop: "16px" }}>
                  <button
                    className="clinic-nav-item"
                    style={{
                      width: "auto",
                      padding: "10px 18px",
                      borderRadius: "8px",
                    }}
                    onClick={() => handleAcceptRequest(request._id)}
                  >
                    Accept Request
                  </button>
                  </div>

                </div>
              ))}
            </div>
          )}

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
