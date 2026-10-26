import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../services/api";
import ReadAloudControls from "../../components/ReadAloudControls";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icons";

// The sidebar is rendered by components/CitizenLayout.jsx.

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MyVaccinationRecord({ onAppointments }) {
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

        const { data } = await api.get(`/doses/citizen/${user.id}`, {
          params: {
            citizenType: "user",
          },
        });

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

  return (
    <>
      <ReadAloudControls
        guidance="Welcome to your vaccination record. This page helps you review your vaccination history. Vaccine Type tells you which vaccine you received. Date shows when you received it. Clinic identifies the clinic where you were vaccinated. Batch Number identifies the vaccine batch. Review each record to check your vaccination details. If your record is missing, contact your clinic or healthcare worker to verify that it has been added."
      />

      <PageHeader
        icon="syringe"
        eyebrow="My vaccinations"
        title="My Vaccination Record"
        description="View your complete vaccination history from all clinics."
        actions={
          !loading &&
          !error &&
          doses.length > 0 && (
            <span className="cz-badge cz-badge--green">
              {doses.length} dose{doses.length > 1 ? "s" : ""} recorded
            </span>
          )
        }
      />

      {loading && (
        <div className="cz-card">
          <div className="cz-loading">
            <div className="cz-spinner" />
            <h3 style={{ margin: 0, color: "var(--cz-ink)" }}>
              Loading your vaccination records…
            </h3>
            <p>Please wait while we retrieve your records.</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="cz-alert cz-alert--error" role="alert">
          <Icon name="alert" size={20} />
          <div>
            <strong>Could not load vaccination records</strong>
            <div>{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && doses.length === 0 && (
        <div className="cz-card">
          <EmptyState
            icon="syringe"
            title="No vaccination records yet"
            text="Your vaccination records will appear here after a clinic worker administers a dose."
            action={
              onAppointments && (
                <button
                  type="button"
                  className="cz-btn cz-btn--primary"
                  onClick={onAppointments}
                >
                  <Icon name="calendar" size={17} /> Book an appointment
                </button>
              )
            }
          />
        </div>
      )}

      {!loading && !error && doses.length > 0 && (
        <section className="cz-card">
          <div className="cz-card__head">
            <div>
              <p className="cz-eyebrow">My records</p>
              <h2>Vaccination history</h2>
              <p>All your vaccination doses from different clinics.</p>
            </div>
          </div>

          <div className="cz-table-wrap">
            <table className="cz-table">
              <thead>
                <tr>
                  <th>Vaccine type</th>
                  <th>Date</th>
                  <th>Clinic</th>
                  <th>Batch number</th>
                </tr>
              </thead>

              <tbody>
                {doses.map((dose) => (
                  <tr key={dose._id}>
                    <td>
                      <div className="cz-cell-main">
                        <span>
                          <Icon name="syringe" size={18} />
                        </span>
                        <strong>{dose.vaccineType}</strong>
                      </div>
                    </td>

                    <td>{formatDate(dose.dateAdministered)}</td>

                    <td>
                      <div className="cz-cell-main">
                        <div>
                          <strong>{dose.clinicId?.name || "Unknown clinic"}</strong>
                          {dose.clinicId?.location && (
                            <small>{dose.clinicId.location}</small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>{dose.batchNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export default MyVaccinationRecord;