import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useLanguage } from "../../i18n/LanguageProvider";
import DashboardLayout from "../../components/DashboardLayout";
import Icon from "../../components/Icons";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ClinicAdminDashboard({
  onLogout,
  onAddWorker,
  onWorkers,
  onOpenInventory,
  onAssignDuty,
  onFeedback,
  onEditProfile,
}) {
  const { t } = useLanguage();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [clinic, setClinic] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [feedbackSummary, setFeedbackSummary] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please login again.");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/workers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load dashboard"
        );
      }

      setClinic(data.clinic);
      setWorkers(data.workers || []);

      const clinicId = data.clinic?._id || data.clinic?.id;

      if (!clinicId) {
        throw new Error("Clinic ID not found");
      }

      // Load confirmed appointments for this clinic
      const appointmentResponse = await api.get(
        `/appointments/clinic/${clinicId}`
      );

      setAppointments(appointmentResponse.data.appointments || []);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    // Feedback numbers for the stat card + sidebar badge
    api
      .get("/feedback/clinic/summary")
      .then((res) => setFeedbackSummary(res.data.summary))
      .catch(() => { });
  }, []);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  const menuGroups = [
    {
      title: "Main Menu",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard" },
        { key: "editProfile", label: "Edit Profile", icon: "user", onClick: onEditProfile },
      ],
    },
    {
      title: "Clinic",
      items: [
        { key: "addWorker", label: "Add Worker", icon: "plus", onClick: onAddWorker },
        { key: "workers", label: "Workers List", icon: "users", onClick: onWorkers },
        { key: "duties", label: "Daily Duties", icon: "clipboard", onClick: onAssignDuty },
        { key: "inventory", label: "Inventory", icon: "box", onClick: onOpenInventory },
        {
          key: "feedback",
          label: "Feedback",
          icon: "message",
          onClick: onFeedback,
          badge: feedbackSummary?.newCount || 0,
        },
      ],
    },
  ];

  const quickActions = [
    { label: "Add Worker", icon: "plus", onClick: onAddWorker },
    { label: "Workers List", icon: "users", onClick: onWorkers },
    { label: "Daily Duties", icon: "clipboard", onClick: onAssignDuty },
    { label: "Inventory", icon: "box", onClick: onOpenInventory },
    { label: "Feedback", icon: "message", onClick: onFeedback },
    { label: "Edit Profile", icon: "user", onClick: onEditProfile },
  ];

  const displayName = user?.name || "Clinic Admin";
  const previewWorkers = workers.slice(0, 5);

  const feedbackHint = feedbackSummary
    ? `${
        feedbackSummary.total ? `★ ${feedbackSummary.averageRating.toFixed(1)} avg · ` : ""
      }${feedbackSummary.newCount} new · ${feedbackSummary.awaitingCitizen} awaiting patient`
    : "Loading…";

  return (
    <DashboardLayout
      ariaLabel={t("Clinic admin menu")}
      user={{ name: displayName, subtitle: t("Clinic Administrator") }}
      onProfileClick={onEditProfile}
      groups={menuGroups}
      activeKey="dashboard"
      onLogout={handleLogout}
    >
      {/* ---------- Welcome banner ---------- */}
      <section className="cz-hero">
        <div className="cz-hero__text">
          <p className="cz-hero__eyebrow">{t(getGreeting())} 👋</p>
          <h1>{t("Clinic Admin Dashboard")}</h1>
          <p>{t("Manage your clinic and view your assigned workers.")}</p>
        </div>

        <div className="cz-hero__actions">
          <button type="button" className="cz-btn cz-btn--light" onClick={onAddWorker}>
            <Icon name="plus" size={18} /> {t("Add Worker")}
          </button>
          <button type="button" className="cz-btn cz-btn--outline-light" onClick={onAssignDuty}>
            <Icon name="clipboard" size={16} /> {t("Daily Duties")}
          </button>
        </div>
      </section>

      {/* ---------- Error ---------- */}
      {error && (
        <div className="cz-alert cz-alert--error" role="alert">
          {error}
        </div>
      )}

      {/* ---------- Clinic information ---------- */}
      {clinic && (
        <section className="cz-clinic">
          <span className="cz-clinic__icon">
            <Icon name="building" size={26} />
          </span>

          <div>
            <p className="cz-eyebrow">{t("MY CLINIC")}</p>
            <h2>{clinic.name}</h2>

            <div className="cz-clinic__meta">
              <span>
                <Icon name="pin" size={16} /> {clinic.location}
              </span>
              <span>
                <Icon name="phone" size={16} /> {clinic.contact}
              </span>
              <span
                className={`cz-badge ${
                  String(clinic.status).toLowerCase() === "active"
                    ? "cz-badge--green"
                    : "cz-badge--gray"
                }`}
              >
                ● {clinic.status}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Stats ---------- */}
      <section className="cz-stats" aria-label={t("Summary")}>
        <StatCard
          icon="users"
          tone="blue"
          label={t("Total Workers")}
          value={workers.length}
          hint={t("Workers in your clinic")}
          loading={loading}
          onClick={onWorkers}
        />
        <StatCard
          icon="building"
          tone="teal"
          label={t("Clinic Status")}
          value={clinic?.status || "—"}
          hint={t("Current clinic status")}
          loading={loading}
        />
        <StatCard
          icon="message"
          tone="amber"
          label={t("Patient Feedback")}
          value={feedbackSummary ? feedbackSummary.total : "—"}
          hint={feedbackHint}
          loading={loading}
          onClick={onFeedback}
        />
      </section>

      <div className="cz-grid-main">
        <div className="cz-stack">
          {/* ---------- Team ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <div>
                <p className="cz-eyebrow">{t("My team")}</p>
                <h2>{t("Workers")}</h2>
              </div>

              {workers.length > 0 && (
                <button type="button" className="cz-btn cz-btn--secondary cz-btn--sm" onClick={onWorkers}>
                  {t("View all")} <Icon name="arrowRight" size={15} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="cz-loading">
                <div className="cz-spinner" />
                <p>{t("Loading your clinic dashboard...")}</p>
              </div>
            ) : previewWorkers.length === 0 ? (
              <EmptyState
                icon="users"
                title={t("No workers yet")}
                text={t("Add a health worker to start assigning duties.")}
                action={
                  <button type="button" className="cz-btn cz-btn--primary cz-btn--sm" onClick={onAddWorker}>
                    <Icon name="plus" size={16} /> {t("Add Worker")}
                  </button>
                }
              />
            ) : (
              <div>
                {previewWorkers.map((worker) => (
                  <div className="cz-list-row" key={worker._id || worker.id || worker.email}>
                    <div className="cz-cell-main">
                      <span>{(worker.name || "W").charAt(0).toUpperCase()}</span>
                      <div>
                        <strong>{worker.name}</strong>
                        <small>{worker.email}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="cz-stack">
          {/* ---------- Quick actions ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <h2>{t("Quick actions")}</h2>
            </div>

            <div className="cz-quick">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="cz-quick__tile"
                  onClick={action.onClick}
                >
                  <span>
                    <Icon name={action.icon} size={20} />
                  </span>
                  {t(action.label)}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ClinicAdminDashboard;
