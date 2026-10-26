import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import MissedDoses from "./MissedDoses";
import Icon from "../../components/Icons";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";

// NOTE: the sidebar now lives in components/CitizenLayout.jsx (shared by every
// citizen page), so this page only renders the dashboard content.

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function CitizenDashboard({
  onEditProfile,
  onFamilyAccount,
  onAppointments,
  onCertificate,
  onVaccinations,
  onFeedback,
  onInHouseVisit,
  onBookRecovery,
}) {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const citizenId = user?.id || user?._id;

  const [doses, setDoses] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!citizenId) {
        setLoading(false);
        return;
      }

      const [doseRes, apptRes, familyRes, feedbackRes] = await Promise.allSettled([
        api.get(`/doses/citizen/${citizenId}`, { params: { citizenType: "user" } }),
        api.get(`/appointments/citizen/${citizenId}`),
        api.get("/family"),
        api.get("/feedback/my-pending"),
      ]);

      if (!active) return;

      if (doseRes.status === "fulfilled") setDoses(doseRes.value.data?.doses || []);
      if (apptRes.status === "fulfilled") {
        setAppointments(apptRes.value.data?.appointments || []);
      }
      if (familyRes.status === "fulfilled") {
        setFamilyCount((familyRes.value.data?.familyMembers || []).length);
      }
      if (feedbackRes.status === "fulfilled") {
        setPendingFeedback((feedbackRes.value.data?.feedback || []).length);
      }

      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [citizenId]);

  const upcoming = useMemo(() => {
    const now = new Date();

    return appointments
      .filter(
        (item) =>
          new Date(item.dateTime) >= now &&
          !["Cancelled", "Completed"].includes(item.status)
      )
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  }, [appointments]);

  const recentDoses = useMemo(
    () =>
      [...doses]
        .sort((a, b) => new Date(b.dateAdministered) - new Date(a.dateAdministered))
        .slice(0, 5),
    [doses]
  );

  const nextAppointment = upcoming[0];
  const nextDate = nextAppointment ? new Date(nextAppointment.dateTime) : null;
  const firstName = (user?.name || "there").split(" ")[0];

  const quickActions = [
    { label: "Book appointment", icon: "calendar", onClick: onAppointments },
    { label: "My certificate", icon: "badge", onClick: onCertificate },
    { label: "Family account", icon: "users", onClick: onFamilyAccount },
    { label: "In-house visit", icon: "home", onClick: onInHouseVisit },
  ];

  return (
    <>
      {/* ---------- Welcome banner ---------- */}
      <section className="cz-hero">
        <div className="cz-hero__text">
          <p className="cz-hero__eyebrow">{getGreeting()} 👋</p>
          <h1>Welcome back, {firstName}</h1>
          <p>Track your vaccination progress, manage appointments and keep your family protected — all in one place.</p>
        </div>

        <div className="cz-hero__actions">
          <button type="button" className="cz-btn cz-btn--light" onClick={onAppointments}>
            <Icon name="plus" size={18} /> Book appointment
          </button>
          <button type="button" className="cz-btn cz-btn--outline-light" onClick={onEditProfile}>
            <Icon name="edit" size={16} /> Edit profile
          </button>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="cz-stats" aria-label="Summary">
        <StatCard
          icon="syringe"
          tone="blue"
          label="Doses received"
          value={doses.length}
          hint={doses.length ? "Across all clinics" : "No vaccination records yet"}
          loading={loading}
        />
        <StatCard
          icon="calendar"
          tone="teal"
          label="Upcoming appointments"
          value={upcoming.length}
          hint={upcoming.length ? "Scheduled for you" : "Nothing scheduled"}
          loading={loading}
        />
        <StatCard
          icon="users"
          tone="green"
          label="Family members"
          value={familyCount}
          hint={familyCount ? "Profiles you manage" : "Add your family"}
          loading={loading}
        />
        <StatCard
          icon="message"
          tone="amber"
          label="Feedback to give"
          value={pendingFeedback}
          hint={pendingFeedback ? "Visits waiting for a review" : "You're all caught up"}
          loading={loading}
        />
      </section>

      <div className="cz-grid-main">
        <div className="cz-stack">
          {/* ---------- Missed doses (existing component) ---------- */}
          <MissedDoses onBookAppointment={onBookRecovery} />

          {/* ---------- Recent vaccinations ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <div>
                <p className="cz-eyebrow">My records</p>
                <h2>Recent vaccinations</h2>
              </div>

              {doses.length > 0 && (
                <button type="button" className="cz-btn cz-btn--secondary cz-btn--sm" onClick={onVaccinations}>
                  View all <Icon name="arrowRight" size={15} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="cz-loading">
                <div className="cz-spinner" />
                <p>Loading your records…</p>
              </div>
            ) : recentDoses.length === 0 ? (
              <EmptyState
                icon="syringe"
                title="No vaccination records yet"
                text="Book an appointment at a nearby clinic to get started. Your doses will appear here once a clinic worker records them."
                action={
                  <button type="button" className="cz-btn cz-btn--primary" onClick={onAppointments}>
                    <Icon name="calendar" size={17} /> Book an appointment
                  </button>
                }
              />
            ) : (
              <div className="cz-table-wrap">
                <table className="cz-table">
                  <thead>
                    <tr>
                      <th>Vaccine</th>
                      <th>Date</th>
                      <th>Clinic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDoses.map((dose) => (
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
                        <td>{dose.clinicId?.name || "Unknown clinic"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="cz-stack">
          {/* ---------- Next appointment ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <h2>Next appointment</h2>
              {nextAppointment && <StatusBadge status={nextAppointment.status} />}
            </div>

            {loading ? (
              <div className="cz-loading">
                <div className="cz-spinner" />
              </div>
            ) : nextAppointment ? (
              <>
                <div className="cz-next">
                  <div className="cz-next__date">
                    <strong>{nextDate.getDate()}</strong>
                    <small>{nextDate.toLocaleString("en-GB", { month: "short" })}</small>
                  </div>
                  <div>
                    <h3>{nextAppointment.vaccineId?.name || "Vaccination"}</h3>
                    <p>
                      {nextAppointment.clinicId?.name || "Clinic"} · {formatTime(nextAppointment.dateTime)}
                    </p>
                    <p>For {nextAppointment.familyProfileId?.name || user?.name || "Myself"}</p>
                  </div>
                </div>

                <div className="cz-item__foot">
                  <button type="button" className="cz-btn cz-btn--secondary cz-btn--sm" onClick={onAppointments}>
                    Manage appointments
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                icon="calendar"
                title="Nothing scheduled"
                text="You have no upcoming appointments."
                action={
                  <button type="button" className="cz-btn cz-btn--primary cz-btn--sm" onClick={onAppointments}>
                    Book now
                  </button>
                }
              />
            )}
          </section>

          {/* ---------- Quick actions ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <h2>Quick actions</h2>
            </div>

            <div className="cz-quick">
              {quickActions.map((action) => (
                <button key={action.label} type="button" className="cz-quick__tile" onClick={action.onClick}>
                  <span>
                    <Icon name={action.icon} size={20} />
                  </span>
                  {action.label}
                </button>
              ))}
            </div>

            {pendingFeedback > 0 && (
              <button
                type="button"
                className="cz-btn cz-btn--secondary cz-btn--block"
                style={{ marginTop: 14, fontSize: 14, padding: "12px 16px" }}
                onClick={onFeedback}
              >
                <Icon name="message" size={17} /> Rate {pendingFeedback} recent visit
                {pendingFeedback > 1 ? "s" : ""}
              </button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default CitizenDashboard;