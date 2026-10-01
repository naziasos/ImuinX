import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../services/api";
import "../clinicAdmin/ClinicAdminDashboard.css";
import "./MyVaccinationRecord.css";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MyVaccinationRecord({
  onDashboard,
  onAppointments,
  onCertificate,
  onFamilyAccount,
  onLogout,
}) {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVaccinationHistory() {
      if (!user?.id) {
        setError("Please log in again to view your vaccination records.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const { data } = await api.get(
          `/doses/citizen/${user.id}`,
          {
            params: {
              citizenType: "user",
            },
          }
        );

        if (!cancelled) {
          setDoses(data?.doses || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVaccinationHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="clinic-dashboard">

      {/* SIDEBAR */}
      <aside className="clinic-sidebar">

        <div>
          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

          <nav className="clinic-nav">

            <p className="clinic-nav-title">
              MAIN MENU
            </p>

            <button
              className="clinic-nav-item"
              onClick={onDashboard}
            >
              <span>📊</span>
              Dashboard
            </button>

            <button className="clinic-nav-item active">
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


      {/* MAIN */}
      <main className="clinic-main">

        <header className="clinic-header">

          <div>
            <p className="clinic-breadcrumb">
              My Vaccinations
            </p>

            <h1>
              My Vaccination Record
            </h1>

            <p className="clinic-description">
              View your complete vaccination history from all clinics.
            </p>
          </div>

          <div className="clinic-profile">

            <div className="clinic-profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "C"}
            </div>

            <div>
              <strong>
                {user?.name || "Citizen"}
              </strong>

              <span>
                Citizen
              </span>
            </div>

          </div>

        </header>


        {/* LOADING */}
        {loading && (
          <div className="vaccination-state">
            <div className="vaccination-spinner"></div>

            <h3>
              Loading your vaccination records...
            </h3>

            <p>
              Please wait while we retrieve your records.
            </p>
          </div>
        )}


        {/* ERROR */}
        {!loading && error && (
          <div className="vaccination-error">
            <h3>
              Could not load vaccination records
            </h3>

            <p>
              {error}
            </p>
          </div>
        )}


        {/* EMPTY */}
        {!loading && !error && doses.length === 0 && (
          <div className="vaccination-state">

            <div className="vaccination-empty-icon">
              💉
            </div>

            <h3>
              No vaccination records yet
            </h3>

            <p>
              Your vaccination records will appear here after a clinic
              worker administers a dose.
            </p>

          </div>
        )}


        {/* RECORDS */}
        {!loading && !error && doses.length > 0 && (
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
                  All your vaccination doses from different clinics.
                </p>
              </div>

            </div>

            <div className="vaccination-table-card">

              <div className="vaccination-table-wrapper">

                <table className="vaccination-table">

                  <thead>
                    <tr>
                      <th>Vaccine Type</th>
                      <th>Date</th>
                      <th>Clinic</th>
                      <th>Batch Number</th>
                    </tr>
                  </thead>

                  <tbody>

                    {doses.map((dose) => (
                      <tr key={dose._id}>

                        <td>
                          <div className="vaccine-name">

                            <span className="vaccine-icon">
                              💉
                            </span>

                            <strong>
                              {dose.vaccineType}
                            </strong>

                          </div>
                        </td>

                        <td>
                          {formatDate(dose.dateAdministered)}
                        </td>

                        <td>
                          <div className="clinic-name">

                            <strong>
                              {dose.clinicId?.name || "Unknown clinic"}
                            </strong>

                            {dose.clinicId?.location && (
                              <span>
                                {dose.clinicId.location}
                              </span>
                            )}

                          </div>
                        </td>

                        <td>
                          {dose.batchNumber || "—"}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          </section>
        )}

      </main>

    </div>
  );
}

export default MyVaccinationRecord;