import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./ShowWork.css";

function ShowWork({ onBack, onLogDose, onAppointments, onLogout }) {
  const [duties, setDuties] = useState([]);
  const [visits, setVisits] = useState([]);
  const [pendingVisits, setPendingVisits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [acceptingId, setAcceptingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("available");

  const getToken = () => localStorage.getItem("token");

  const getArrayFromResponse = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.duties)) return data.duties;
    if (Array.isArray(data?.requests)) return data.requests;
    if (Array.isArray(data?.visits)) return data.visits;
    return [];
  };

  const fetchWork = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [dutyResponse, pendingResponse, assignedResponse] =
        await Promise.all([
          fetch("http://localhost:5000/api/clinics/my-duty", { headers }),
          fetch("http://localhost:5000/api/in-house-requests/pending", {
            headers,
          }),
          fetch("http://localhost:5000/api/in-house-requests/assigned", {
            headers,
          }),
        ]);

      const [dutyData, pendingData, assignedData] = await Promise.all([
        dutyResponse.json(),
        pendingResponse.json(),
        assignedResponse.json(),
      ]);

      if (!dutyResponse.ok) {
        throw new Error(dutyData.message || "Failed to load duties");
      }

      if (!pendingResponse.ok) {
        throw new Error(
          pendingData.message || "Failed to load available visit requests"
        );
      }

      if (!assignedResponse.ok) {
        throw new Error(
          assignedData.message || "Failed to load accepted and completed visits"
        );
      }

      setDuties(getArrayFromResponse(dutyData));
      setPendingVisits(getArrayFromResponse(pendingData));
      setVisits(getArrayFromResponse(assignedData));
    } catch (err) {
      setError(err.message || "Failed to load your work");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWork();
  }, [fetchWork]);

  const formatDate = (date) => {
    if (!date) return "Not specified";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "Not specified";

    return parsed.toLocaleDateString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLocalDateKey = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const inHouseDutyDates = useMemo(() => {
    return new Set(
      duties
        .filter((duty) => duty.dutyType === "In-House Visit")
        .map((duty) => getLocalDateKey(duty.dutyDate))
        .filter(Boolean)
    );
  }, [duties]);

  const eligiblePendingVisits = useMemo(() => {
    return pendingVisits.filter((visit) =>
      inHouseDutyDates.has(getLocalDateKey(visit.preferredDate))
    );
  }, [pendingVisits, inHouseDutyDates]);

  const acceptedVisits = useMemo(
    () => visits.filter((visit) => visit.status === "Accepted"),
    [visits]
  );

  const completedVisits = useMemo(
    () => visits.filter((visit) => visit.status === "Completed"),
    [visits]
  );

  const getCitizenName = (visit) => {
    if (visit.citizen && typeof visit.citizen === "object") {
      return visit.citizen.name || "N/A";
    }

    return "N/A";
  };

  const getSearchableText = (visit) => {
    const familyName =
      typeof visit.familyMember === "object"
        ? visit.familyMember?.name || ""
        : "";

    return [
      getCitizenName(visit),
      familyName,
      visit.address,
      visit.location,
      visit.vaccineOrReason,
      visit.status,
      visit.preferredDate,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  const search = searchTerm.trim().toLowerCase();

  const filteredPendingVisits = eligiblePendingVisits.filter((visit) =>
    getSearchableText(visit).includes(search)
  );

  const filteredAcceptedVisits = acceptedVisits.filter((visit) =>
    getSearchableText(visit).includes(search)
  );

  const filteredCompletedVisits = completedVisits.filter((visit) =>
    getSearchableText(visit).includes(search)
  );

  const displayedVisits =
    activeTab === "available"
      ? filteredPendingVisits
      : activeTab === "assigned"
      ? filteredAcceptedVisits
      : filteredCompletedVisits;

  const availableCount = eligiblePendingVisits.length;
  const acceptedCount = acceptedVisits.length;
  const completedCount = completedVisits.length;

  const acceptVisit = async (id) => {
    try {
      setAcceptingId(id);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/in-house-requests/${id}/accept`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to accept this visit");
      }

      alert("In-house visit accepted successfully.");
      await fetchWork();
      setActiveTab("assigned");
    } catch (err) {
      setError(err.message || "Failed to accept visit");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCompleteVisit = async (id) => {
    try {
      setCompletingId(id);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/in-house-requests/${id}/complete`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete visit");
      }

      alert("Visit completed successfully.");
      await fetchWork();
      setActiveTab("completed");
    } catch (err) {
      setError(err.message || "Failed to complete visit");
    } finally {
      setCompletingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) onLogout();
  };

  if (loading) {
    return <div className="show-work-container">Loading your work...</div>;
  }

  const tabInfo = {
    available: {
      title: "Available Requests",
      emptyIcon: "🔍",
      emptyTitle: search
        ? "No matching requests"
        : "No available requests for your duty dates",
      emptyDescription:
        "Pending requests appear here only when their preferred date matches one of your In-House Visit duty dates.",
    },
    assigned: {
      title: "My Accepted Visits",
      emptyIcon: "🏠",
      emptyTitle: search
        ? "No matching accepted visits"
        : "No accepted visits yet",
      emptyDescription:
        "Requests you accept will appear here until you complete the visit.",
    },
    completed: {
      title: "Completed Visits",
      emptyIcon: "✅",
      emptyTitle: search
        ? "No matching completed visits"
        : "No completed visits yet",
      emptyDescription:
        "Visits you mark as completed will appear here.",
    },
  };

  const currentTab = tabInfo[activeTab];

  return (
    <div className="clinic-dashboard">
      <aside className="clinic-sidebar">
        <div className="clinic-logo">
          <div className="clinic-logo-icon">💉</div>
          <div>
            <h2>ImuniX</h2>
            <span>HEALTH WORKER</span>
          </div>
        </div>

        <nav className="clinic-nav">
          <button className="clinic-nav-item" onClick={onBack}>
            <span>🏠</span>
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

          <button className="clinic-nav-item active" type="button">
            <span>📋</span>
            Show Work
          </button>
        </nav>

        <button className="clinic-logout" onClick={handleLogout}>
          <span>↪</span>
          Logout
        </button>
      </aside>

      <main className="clinic-main">
        <div className="show-work-container">
          <div className="show-work-header">
            <div>
              <p className="show-work-label">HEALTH WORKER</p>
              <h1>My Work</h1>
              <p>Manage your duties and in-house visit requests.</p>
            </div>

            <button
              type="button"
              className="refresh-btn"
              onClick={fetchWork}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {error && (
            <div className="worker-error" role="alert">
              {error}
            </div>
          )}

          <div className="show-work-card">
            <div className="show-work-card-header">
              <div>
                <h2>Assigned Duties</h2>
                <p>Your current duty assignments</p>
              </div>
              <div className="show-work-count">{duties.length}</div>
            </div>

            {duties.length === 0 ? (
              <div className="show-work-empty">
                <div>📅</div>
                <h3>No duty assigned</h3>
                <p>You currently have no duty assignments.</p>
              </div>
            ) : (
              <div className="show-work-list">
                {duties.map((duty) => (
                  <div className="show-work-duty" key={duty._id}>
                    <div className="show-work-duty-icon">📅</div>

                    <div className="show-work-duty-info">
                      <span>Duty Date</span>
                      <strong>{formatDate(duty.dutyDate)}</strong>
                    </div>

                    <div className="show-work-duty-info">
                      <span>Duty Type</span>
                      <strong>{duty.dutyType}</strong>
                    </div>

                    <div className="show-work-status">Assigned</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="show-work-card">
            <div className="show-work-card-header">
              <div>
                <h2>In-House Visits</h2>
                <p>
                  Available requests are shown only for your assigned
                  In-House Visit duty dates.
                </p>
              </div>

              <div className="show-work-count">
                {activeTab === "available"
                  ? availableCount
                  : activeTab === "assigned"
                  ? acceptedCount
                  : completedCount}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <button
                type="button"
                className="refresh-btn"
                onClick={() => setActiveTab("available")}
                disabled={activeTab === "available"}
              >
                Available Requests ({availableCount})
              </button>

              <button
                type="button"
                className="refresh-btn"
                onClick={() => setActiveTab("assigned")}
                disabled={activeTab === "assigned"}
              >
                My Accepted Visits ({acceptedCount})
              </button>

              <button
                type="button"
                className="refresh-btn"
                onClick={() => setActiveTab("completed")}
                disabled={activeTab === "completed"}
              >
                Completed Visits ({completedCount})
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Search by citizen, address, location or reason..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
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

            {displayedVisits.length === 0 ? (
              <div className="show-work-empty">
                <div>{currentTab.emptyIcon}</div>
                <h3>{currentTab.emptyTitle}</h3>
                <p>{currentTab.emptyDescription}</p>
              </div>
            ) : (
              <div className="show-work-list">
                {displayedVisits.map((visit) => (
                  <div className="show-work-duty" key={visit._id}>
                    <div className="show-work-duty-icon">
                      {activeTab === "completed" ? "✅" : "🏠"}
                    </div>

                    <div className="show-work-duty-info">
                      <span>Citizen</span>
                      <strong>{getCitizenName(visit)}</strong>
                    </div>

                    <div className="show-work-duty-info">
                      <span>Address / Location</span>
                      <strong>
                        {[visit.address, visit.location]
                          .filter(Boolean)
                          .join(", ") || "Not provided"}
                      </strong>
                    </div>

                    <div className="show-work-duty-info">
                      <span>Preferred Date</span>
                      <strong>{formatDate(visit.preferredDate)}</strong>
                    </div>

                    <div className="show-work-duty-info">
                      <span>Reason / Vaccine</span>
                      <strong>
                        {visit.vaccineOrReason || "Not specified"}
                      </strong>
                    </div>

                    {activeTab === "available" ? (
                      <button
                        type="button"
                        className="process-btn"
                        onClick={() => acceptVisit(visit._id)}
                        disabled={acceptingId === visit._id}
                      >
                        {acceptingId === visit._id
                          ? "Accepting..."
                          : "Accept Request"}
                      </button>
                    ) : (
                      <>
                        <div className="show-work-status">
                          {visit.status || "Accepted"}
                        </div>

                        {visit.status === "Completed" ? (
                          <span>Visit completed</span>
                        ) : (
                          <button
                            type="button"
                            className="complete-visit-btn"
                            onClick={() => handleCompleteVisit(visit._id)}
                            disabled={completingId === visit._id}
                          >
                            {completingId === visit._id
                              ? "Completing..."
                              : "Complete Visit"}
                          </button>
                        )}
                      </>
                    )}
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