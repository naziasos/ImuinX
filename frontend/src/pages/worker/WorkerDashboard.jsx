import { useEffect, useState } from "react";
import { api, errorMessage } from "../../services/api";
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


function WorkerDashboard({
  onLogout,
  onLogDose,
  onShowWork,
  onAppointments,
  onGuestCheckIn,
  onEditProfile,
}) {
  const { t } = useLanguage();

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

  const displayName = user?.name || "Worker";

  const menuGroups = [
    {
      title: "Main Menu",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard" },
        { key: "editProfile", label: "Edit Profile", icon: "user", onClick: onEditProfile },
      ],
    },
    {
      title: "Vaccination",
      items: [
        { key: "appointments", label: "Appointments", icon: "calendar", onClick: onAppointments },
        { key: "guestCheckIn", label: "Campaign Check-in", icon: "idcard", onClick: onGuestCheckIn },
        { key: "logDose", label: "Log Dose", icon: "syringe", onClick: onLogDose },
        { key: "showWork", label: "Show Work", icon: "clipboard", onClick: onShowWork },
      ],
    },
  ];

  const quickActions = [
    { label: "Log Dose", icon: "syringe", onClick: onLogDose },
    { label: "Appointments", icon: "calendar", onClick: onAppointments },
    { label: "Campaign Check-in", icon: "idcard", onClick: onGuestCheckIn },
    { label: "Show Work", icon: "clipboard", onClick: onShowWork },
    { label: "Edit Profile", icon: "user", onClick: onEditProfile },
  ];

  return (
    <DashboardLayout
      ariaLabel={t("Health worker menu")}
      user={{ name: displayName, subtitle: t("Health Worker") }}
      onProfileClick={onEditProfile}
      groups={menuGroups}
      activeKey="dashboard"
      onLogout={handleLogout}
    >
      {/* ---------- Welcome banner ---------- */}
      <section className="cz-hero">
        <div className="cz-hero__text">
          <p className="cz-hero__eyebrow">{t(getGreeting())} 👋</p>
          <h1>{t("Worker Dashboard")}</h1>
          <p>
            {t("View today's appointments and manage vaccinations for your clinic.")}
          </p>
        </div>

        <div className="cz-hero__actions">
          <button type="button" className="cz-btn cz-btn--light" onClick={onLogDose}>
            <Icon name="syringe" size={18} /> {t("Log Dose")}
          </button>
          <button type="button" className="cz-btn cz-btn--outline-light" onClick={onAppointments}>
            <Icon name="calendar" size={16} /> {t("Appointments")}
          </button>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="cz-stats" aria-label={t("Summary")}>
        <StatCard
          icon="calendar"
          tone="blue"
          label={t("Today's Appointments")}
          value={0}
          hint={t("Nothing scheduled today")}
        />
        <StatCard
          icon="syringe"
          tone="teal"
          label={t("Doses Administered")}
          value={0}
          hint={t("No records yet")}
        />
        <StatCard
          icon="home"
          tone="amber"
          label={t("Pending In-House Requests")}
          value={pendingRequests.length}
          hint={t("Waiting for you")}
          loading={loadingRequests}
        />
      </section>

      <div className="cz-grid-main">
        <div className="cz-stack">
          {/* ---------- Pending in-house requests ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <div>
                <p className="cz-eyebrow">{t("IN-HOUSE SERVICE")}</p>
                <h2>{t("Pending In-House Requests")}</h2>
                <p>{t("Citizens waiting for a health worker to accept their request.")}</p>
              </div>
            </div>

            {loadingRequests ? (
              <div className="cz-loading">
                <div className="cz-spinner" />
                <p>{t("Loading requests...")}</p>
              </div>
            ) : requestError ? (
              <EmptyState
                icon="alert"
                title={t("Unable to load requests")}
                text={requestError}
              />
            ) : pendingRequests.length === 0 ? (
              <EmptyState
                icon="home"
                title={t("No pending requests")}
                text={t("There are no in-house vaccination requests waiting for you.")}
              />
            ) : (
              <div className="cz-request-list">
                {pendingRequests.map((request) => (
                  <div className="cz-item" key={request._id}>
                    <div className="cz-item__top">
                      <div>
                        <h3>{request.citizen?.name || t("Citizen")}</h3>
                      </div>
                      <span className="cz-badge cz-badge--amber">{t("Pending")}</span>
                    </div>

                    <dl className="cz-facts">
                      <div>
                        <dt>{t("Address")}</dt>
                        <dd>{request.address || t("Not provided")}</dd>
                      </div>
                      <div>
                        <dt>{t("Preferred Date")}</dt>
                        <dd>
                          {request.preferredDate
                            ? new Date(request.preferredDate).toLocaleDateString()
                            : t("Not specified")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Vaccine / Reason")}</dt>
                        <dd>{request.vaccineOrReason || t("Not provided")}</dd>
                      </div>
                    </dl>

                    <div className="cz-item__foot">
                      <button
                        type="button"
                        className="cz-btn cz-btn--primary cz-btn--sm"
                        onClick={() => handleAcceptRequest(request._id)}
                      >
                        {t("Accept Request")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---------- Appointments ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <div>
                <p className="cz-eyebrow">{t("SCHEDULE")}</p>
                <h2>{t("Upcoming Appointments")}</h2>
                <p>{t("Appointments assigned to you will appear here.")}</p>
              </div>
            </div>

            <EmptyState
              icon="calendar"
              title={t("No appointments yet")}
              text={t("You're all caught up for now.")}
            />
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

export default WorkerDashboard;
