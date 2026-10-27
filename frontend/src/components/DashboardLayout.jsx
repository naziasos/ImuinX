import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import useTheme from "../hooks/useTheme";
import Icon from "./Icons";
import "../styles/citizen.css";
import "../styles/dashboard-theme.css";

/**
 * Sidebar shell for the staff dashboards (admin, clinic admin, health worker).
 * Same markup and classes as <CitizenLayout>, so all roles look identical;
 * the menu items are passed in so each role keeps its own existing actions.
 *
 * Props
 *  - ariaLabel:      accessible name of the sidebar
 *  - user:           { name, subtitle } shown in the profile card
 *  - onProfileClick: optional; makes the profile card clickable
 *  - groups:         [{ title, items: [{ key, label, icon, onClick, badge }] }]
 *  - activeKey:      key of the highlighted item
 *  - onLogout:       optional; shows a "Log out" item when provided
 */
function DashboardLayout({
  ariaLabel,
  user,
  onProfileClick,
  groups,
  activeKey,
  onLogout,
  children,
}) {
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const allItems = groups.flatMap((group) => group.items);
  const currentLabel = allItems.find((item) => item.key === activeKey)?.label || "Dashboard";
  const displayName = user?.name || "";
  const themeLabel = isDark ? t("Light mode") : t("Dark mode");

  const go = (item) => {
    setMenuOpen(false);
    if (item.key !== activeKey) item.onClick?.();
  };

  const profileBody = (
    <>
      <span className="cz-user__avatar">{displayName.charAt(0).toUpperCase() || "?"}</span>
      <span className="cz-user__text">
        <strong>{displayName}</strong>
        <small>{user?.subtitle}</small>
      </span>
    </>
  );

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
      <aside className={`cz-sidebar ${menuOpen ? "is-open" : ""}`} aria-label={ariaLabel}>
        <button
          type="button"
          className="cz-sidebar__close"
          onClick={() => setMenuOpen(false)}
          aria-label={t("Close menu")}
        >
          <Icon name="close" size={20} />
        </button>

        {onProfileClick ? (
          <button
            type="button"
            className="cz-user"
            onClick={() => {
              setMenuOpen(false);
              onProfileClick();
            }}
            title={t("Edit my profile")}
          >
            {profileBody}
          </button>
        ) : (
          <div className="cz-user cz-user--static">{profileBody}</div>
        )}

        <nav className="cz-nav">
          {groups.map((group) => (
            <div className="cz-nav__group" key={group.title}>
              <p className="cz-nav__title">{t(group.title)}</p>

              {group.items.map((item) => {
                const active = activeKey === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`cz-nav__item ${active ? "is-active" : ""}`}
                    onClick={() => go(item)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>{t(item.label)}</span>

                    {item.badge > 0 && <em className="cz-nav__badge">{item.badge}</em>}
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

          {onLogout && (
            <button type="button" className="cz-nav__item cz-nav__item--logout" onClick={onLogout}>
              <Icon name="logout" size={19} />
              <span>{t("Log out")}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ---------- Page content ---------- */}
      <main className="cz-content">
        <div className="cz-content__inner">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
