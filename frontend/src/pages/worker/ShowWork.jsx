import React, { useEffect, useState } from "react";
import "./ShowWork.css";

function ShowWork({ onBack, onLogDose, onAppointments, onLogout }) {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDuties = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/clinics/my-duty",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load duties");
        }

        setDuties(data.duties || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDuties();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div>Loading duties...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
  <div className="clinic-dashboard">

    {/* Sidebar */}
    <aside className="clinic-sidebar">

      <div className="clinic-logo">
        <div className="clinic-logo-icon">💉</div>
        <div>
          <h2>ImuniX</h2>
          <span>HEALTH WORKER</span>
        </div>
      </div>

      <nav className="clinic-nav">

        <button className="clinic-nav-item"
        onClick={onBack}
        >
          <span>🏠</span>
          Dashboard
        </button>

        <button className="clinic-nav-item"
         onClick={onAppointments}
         >
          <span>📅</span>
          Appointments
        </button>

        <button className="clinic-nav-item"
        onClick={onLogDose}
        >
          <span>💉</span>
          Log Dose
        </button>

        <button className="clinic-nav-item active"
         onClick={onLogout}
         >
          <span>📋</span>
          Show Work
        </button>

        <button className="clinic-nav-item">
          <span>⚙️</span>
          Settings
        </button>

      </nav>

      <button className="clinic-logout">
        <span>↪</span>
        Logout
      </button>

    </aside>


    {/* Main Content */}
    <main className="clinic-main">

      <div className="show-work-container">

        <div className="show-work-header">
          <div>
            <p className="show-work-label">HEALTH WORKER</p>
            <h1>My Work</h1>
            <p>View your assigned vaccination duties.</p>
          </div>

          <div className="show-work-icon">📋</div>
        </div>


        <div className="show-work-card">

          <div className="show-work-card-header">
            <div>
              <h2>Assigned Duties</h2>
              <p>Your current vaccination duty assignments</p>
            </div>

            <div className="show-work-count">
              {duties.length}
            </div>
          </div>


          {duties.length === 0 ? (
            <div className="show-work-empty">
              <div>📅</div>

              <h3>No duty assigned</h3>

              <p>
                You currently don't have any vaccination duty assigned.
              </p>
            </div>
          ) : (
            <div className="show-work-list">

              {duties.map((duty) => (
                <div className="show-work-duty" key={duty._id}>

                  <div className="show-work-duty-icon">
                    📅
                  </div>

                  <div className="show-work-duty-info">
                    <span>Duty Date</span>
                    <strong>
                      {formatDate(duty.dutyDate)}
                    </strong>
                  </div>

                  <div className="show-work-duty-info">
                    <span>Duty Type</span>
                    <strong>
                      {duty.dutyType}
                    </strong>
                  </div>

                  <div className="show-work-status">
                    Assigned
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>

    </main>

  </div>
);
}

export default ShowWork;