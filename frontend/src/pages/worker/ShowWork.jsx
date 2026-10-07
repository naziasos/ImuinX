import React, { useEffect, useState } from "react";
import "./ShowWork.css";

function ShowWork({ onBack, onLogDose, onAppointments, onLogout }) {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visits, setVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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
        const visitResponse = await fetch(
          "http://localhost:5000/api/in-house-requests/assigned",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const visitData = await visitResponse.json();

        if (!visitResponse.ok) {
          throw new Error(
            visitData.message || "Failed to load assigned visits"
          );
        }

        setVisits(visitData.data || []);
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
  const filteredVisits = visits.filter((visit) => {
    const search = searchTerm.toLowerCase();

    return (
      visit.citizen?.name?.toLowerCase().includes(search) ||
      visit.address?.toLowerCase().includes(search) ||
      visit.vaccineOrReason?.toLowerCase().includes(search)
    );
  });
  const handleCompleteVisit = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/in-house-requests/${id}/complete`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to complete visit"
        );
      }

      setVisits((prevVisits) =>
        prevVisits.filter((visit) => visit._id !== id)
      );

      alert("Visit completed successfully.");
    } catch (err) {
      alert(err.message);
    }
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
                      Accepted
                    </div>


                  </div>
                ))}

              </div>
            )}

          </div>
          <div className="show-work-card">

            <div className="show-work-card-header">
              <div>
                <h2>In-House Visits</h2>
                <p>Accepted home vaccination visits</p>
              </div>

              <div className="show-work-count">
                {visits.length}
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Search by citizen, address or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {visits.length === 0 ? (
              <div className="show-work-empty">
                <div>🏠</div>

                <h3>No accepted visit</h3>

                <p>
                  You currently don't have any accepted in-house visit.
                </p>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="show-work-empty">
                <div>🔍</div>

                <h3>No matching visit</h3>

                <p>
                  No in-house visit matches your search.
                </p>
              </div>
            ) : (
              <div className="show-work-list">

                {filteredVisits.map((visit) => (
                  <div className="show-work-duty" key={visit._id}>

                    <div className="show-work-duty-icon">
                      🏠
                    </div>

                    <div className="show-work-duty-info">
                      <span>Citizen</span>
                      <strong>
                        {visit.citizen?.name || "N/A"}
                      </strong>
                    </div>

                    <div className="show-work-duty-info">
                      <span>Address</span>
                      <strong>
                        {visit.address || "N/A"}
                      </strong>
                    </div>

                    <div className="show-work-duty-info">
                      <span>Preferred Date</span>
                      <strong>
                        {formatDate(visit.preferredDate)}
                      </strong>
                    </div>

                    <div className="show-work-status">
                      Accepted
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCompleteVisit(visit._id)}
                      className="complete-visit-btn"
                    >
                      Complete Visit
                    </button>

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