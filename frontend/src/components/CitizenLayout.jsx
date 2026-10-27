import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import { api } from "../services/api";
import useTheme from "../hooks/useTheme";
import Icon from "./Icons";
import "../styles/citizen.css";
import "../styles/dashboard-theme.css";

/**
 * One sidebar for the whole citizen area.
 * App.jsx wraps every citizen page in this component, so the menu is
 * identical everywhere and always highlights the page you are on.
 *
 * Props
 *  - page:       current page key used by App.jsx (e.g. "myCertificate")
 *  - onNavigate: (pageKey) => void
 *  - onLogout:   () => void
 */

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [{ page: "citizenDashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Vaccination",
    items: [
      { page: "myVaccinations", label: "My Vaccinations", icon: "syringe" },
      { page: "nearbyClinics", label: "Nearby Clinics", icon: "pin" },
      { page: "bookAppointment", label: "Appointments", icon: "calendar" },
      { page: "myCertificate", label: "My Certificate", icon: "badge" },
    ],
  },
  {
    title: "Home visits",
    items: [
      { page: "requestInHouseVisit", label: "Request In-House Visit", icon: "home" },
      { page: "myInHouseRequests", label: "My In-House Requests", icon: "clipboard" },
    ],
  },
  {
    title: "Account",
    items: [
      { page: "familyAccount", label: "Family Account", icon: "users" },
      { page: "feedback", label: "Feedback", icon: "message", badge: true },
      { page: "editProfile", label: "Profile & Settings", icon: "user" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function CitizenLayout({ page, onNavigate, onLogout, children }) {
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(0);

  // Badge on the Feedback item: vaccinations still waiting for a review.
  // Re-checked whenever the citizen moves to another page.
  useEffect(() => {
    let active = true;

    api
      .get("/feedback/my-pending")
      .then((res) => {
        if (active) setPendingFeedback((res.data.feedback || []).length);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [page]);

  // Close the mobile drawer on Escape and lock page scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Every page change starts at the top of the content.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page]);

  const go = (target) => {
    setMenuOpen(false);
    if (target !== page) onNavigate?.(target);
  };

  const currentLabel = ALL_ITEMS.find((item) => item.page === page)?.label || "Dashboard";
  const displayName = user?.name || "Citizen";
  const themeLabel = isDark ? t("Light mode") : t("Dark mode");

  return (
    <div className="cz-shell">
      {/* ---------- Mobile top bar ---------- */}
      <div className="cz-mobilebar">
        <button
          type="button"
          className="cz-mobilebar__btn"
          onClick={() => setMenuOpen(true)}
          aria-label={t("Open menu")}
          aria-expanded={menuOpen}
        >
          <Icon name="menu" size={22} />
        </button>
        <span className="cz-mobilebar__title">{t(currentLabel)}</span>
        <button
          type="button"
          className="cz-mobilebar__btn cz-mobilebar__theme"
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
        >
          <Icon name={isDark ? "sun" : "moon"} size={20} />
        </button>
      </div>

      {menuOpen && (
        <div className="cz-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      {/* ---------- Sidebar ---------- */}
      <aside className={`cz-sidebar ${menuOpen ? "is-open" : ""}`} aria-label={t("Citizen menu")}>
        <button
          type="button"
          className="cz-sidebar__close"
          onClick={() => setMenuOpen(false)}
          aria-label={t("Close menu")}
        >
          <Icon name="close" size={20} />
        </button>

        <button
          type="button"
          className="cz-user"
          onClick={() => go("editProfile")}
          title={t("Edit my profile")}
        >
          <span className="cz-user__avatar">{displayName.charAt(0).toUpperCase()}</span>
          <span className="cz-user__text">
            <strong>{displayName}</strong>
            <small>{user?.email || t("Citizen account")}</small>
          </span>
        </button>

        <nav className="cz-nav">
          {NAV_GROUPS.map((group) => (
            <div className="cz-nav__group" key={group.title}>
              <p className="cz-nav__title">{t(group.title)}</p>

              {group.items.map((item) => {
                const active = page === item.page;

                return (
                  <button
                    key={item.page}
                    type="button"
                    className={`cz-nav__item ${active ? "is-active" : ""}`}
                    onClick={() => go(item.page)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>{t(item.label)}</span>

                    {item.badge && pendingFeedback > 0 && (
                      <em className="cz-nav__badge">{pendingFeedback}</em>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="cz-sidebar__foot">
          <button
            type="button"
            className="cz-nav__item cz-theme-toggle"
            onClick={toggleTheme}
            aria-pressed={isDark}
          >
            <Icon name={isDark ? "sun" : "moon"} size={19} />
            <span>{themeLabel}</span>
          </button>

          <button type="button" className="cz-nav__item cz-nav__item--logout" onClick={onLogout}>
            <Icon name="logout" size={19} />
            <span>{t("Log out")}</span>
          </button>
        </div>
      </aside>

      {/* ---------- Page content ---------- */}
      <main className="cz-content">
        <div className="cz-content__inner">{children}</div>
      </main>
    </div>
  );
}

export default CitizenLayout;