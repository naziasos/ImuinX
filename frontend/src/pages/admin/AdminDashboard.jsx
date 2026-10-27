import { useMemo, useState } from "react";
import { useLanguage } from "../../i18n/LanguageProvider";
import DashboardLayout from "../../components/DashboardLayout";
import Icon from "../../components/Icons";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";

// NOTE: the layout (sidebar, theme toggle) lives in components/DashboardLayout.jsx
// and shares its styles with the citizen area (styles/citizen.css).

const clinics = [
  {
    name: "Dhanmondi Vaccination Center",
    location: "Dhanmondi, Dhaka",
    contact: "01711-123456",
    status: "Active",
  },
  {
    name: "Uttara Health Clinic",
    location: "Uttara, Dhaka",
    contact: "01822-456789",
    status: "Active",
  },
  {
    name: "Mirpur Community Clinic",
    location: "Mirpur, Dhaka",
    contact: "01933-987654",
    status: "Active",
  },
  {
    name: "Gulshan Medical Center",
    location: "Gulshan, Dhaka",
    contact: "01644-555555",
    status: "Inactive",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function AdminDashboard({ onAddClinic, onManageVaccines, onManageSchedules, onManageCampaigns }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const adminName = user?.name || "Admin";

  const activeClinics = clinics.filter((clinic) => clinic.status === "Active").length;
  const activePercent = clinics.length ? Math.round((activeClinics / clinics.length) * 100) : 0;

  const filteredClinics = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clinics;

    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(query) ||
        clinic.location.toLowerCase().includes(query) ||
        clinic.contact.toLowerCase().includes(query)
    );
  }, [search]);

  const menuGroups = [
    {
      title: "Main Menu",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard" },
        { key: "addClinic", label: "Add New Clinic", icon: "building", onClick: onAddClinic },
      ],
    },
    {
      title: "Vaccination",
      items: [
        { key: "vaccines", label: "Manage Vaccines", icon: "syringe", onClick: onManageVaccines },
        {
          key: "schedules",
          label: "Manage Vaccine Schedules",
          icon: "calendar",
          onClick: onManageSchedules,
        },
        {
          key: "campaigns",
          label: "Vaccine Campaigns",
          icon: "megaphone",
          onClick: onManageCampaigns,
        },
      ],
    },
  ];

  const quickActions = [
    {
      label: "Add New Clinic",
      text: "Register a vaccination clinic",
      icon: "building",
      onClick: onAddClinic,
    },
    {
      label: "Manage Vaccines",
      text: "Add a new vaccine to the catalogue",
      icon: "syringe",
      onClick: onManageVaccines,
    },
    {
      label: "Manage Vaccine Schedules",
      text: "Set vaccine ages and dose intervals",
      icon: "calendar",
      onClick: onManageSchedules,
    },
    {
      label: "Vaccine Campaigns",
      text: "Publish campaigns to the notification bell",
      icon: "megaphone",
      onClick: onManageCampaigns,
    },
  ];

  return (
    <DashboardLayout
      ariaLabel={t("Admin menu")}
      user={{ name: adminName, subtitle: t("Administrator") }}
      groups={menuGroups}
      activeKey="dashboard"
    >
      {/* ---------- Welcome banner ---------- */}
      <section className="cz-hero">
        <div className="cz-hero__text">
          <p className="cz-hero__eyebrow">{t(getGreeting())} 👋</p>
          <h1>{t("Admin Dashboard")}</h1>
          <p>{t("Welcome back! Here's what's happening with your vaccination system.")}</p>
        </div>

        <div className="cz-hero__actions">
          <button type="button" className="cz-btn cz-btn--light" onClick={onAddClinic}>
            <Icon name="plus" size={18} /> {t("Add New Clinic")}
          </button>
          <button type="button" className="cz-btn cz-btn--outline-light" onClick={onManageVaccines}>
            <Icon name="syringe" size={16} /> {t("Manage Vaccines")}
          </button>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="cz-stats" aria-label={t("Summary")}>
        <StatCard
          icon="building"
          tone="blue"
          label={t("Total Clinics")}
          value={clinics.length}
          hint={t("Registered clinics")}
        />
        <StatCard
          icon="check"
          tone="teal"
          label={t("Active Clinics")}
          value={activeClinics}
          hint={`${activePercent}% ${t("active")}`}
        />
        <StatCard
          icon="users"
          tone="green"
          label={t("Total Citizens")}
          value={0}
          hint={t("Registered citizens")}
        />
        <StatCard
          icon="syringe"
          tone="amber"
          label={t("Vaccinations")}
          value={0}
          hint={t("Total vaccinations")}
        />
      </section>

      <div className="cz-grid-main">
        <div className="cz-stack">
          {/* ---------- Clinics ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <div>
                <p className="cz-eyebrow">{t("CLINIC MANAGEMENT")}</p>
                <h2>{t("All Clinics")}</h2>
                <p>{t("Manage registered vaccination clinics")}</p>
              </div>

              <button type="button" className="cz-btn cz-btn--primary cz-btn--sm" onClick={onAddClinic}>
                <Icon name="plus" size={16} /> {t("Add New Clinic")}
              </button>
            </div>

            <label className="cz-search">
              <Icon name="search" size={18} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search clinics...")}
                aria-label={t("Search clinics...")}
              />
            </label>

            {filteredClinics.length === 0 ? (
              <EmptyState
                icon="search"
                title={t("No clinics found")}
                text={t("Try a different search term.")}
              />
            ) : (
              <div className="cz-table-wrap">
                <table className="cz-table">
                  <thead>
                    <tr>
                      <th>{t("Clinic")}</th>
                      <th>{t("Location")}</th>
                      <th>{t("Contact")}</th>
                      <th>{t("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClinics.map((clinic) => (
                      <tr key={clinic.name}>
                        <td>
                          <div className="cz-cell-main">
                            <span>
                              <Icon name="building" size={18} />
                            </span>
                            <div>
                              <strong>{clinic.name}</strong>
                              <small>{t("Vaccination Center")}</small>
                            </div>
                          </div>
                        </td>
                        <td>{clinic.location}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{clinic.contact}</td>
                        <td>
                          <span
                            className={`cz-badge ${
                              clinic.status === "Active" ? "cz-badge--green" : "cz-badge--gray"
                            }`}
                          >
                            {t(clinic.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="cz-hint" style={{ marginTop: 14 }}>
              {t("Showing {{shown}} of {{total}} clinics", {
                shown: filteredClinics.length,
                total: clinics.length,
              })}
            </p>
          </section>
        </div>

        <div className="cz-stack">
          {/* ---------- Quick actions ---------- */}
          <section className="cz-card">
            <div className="cz-card__head">
              <div>
                <h2>{t("Quick Actions")}</h2>
                <p>{t("Frequently used administration tools")}</p>
              </div>
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

          {/* ---------- System status ---------- */}
          <section className="cz-card cz-status-card">
            <div>
              <span className="cz-empty__icon" style={{ margin: 0, width: 48, height: 48 }}>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <h3>{t("System Status")}</h3>
                <p>{t("All ImuniX services are currently operational.")}</p>
              </div>
            </div>
            <span className="cz-badge cz-badge--green">● {t("All Systems Operational")}</span>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
