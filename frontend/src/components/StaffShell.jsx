import { useRef } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import DashboardLayout from "./DashboardLayout";
import useTilt from "../hooks/useTilt";
import "../styles/staff-pages.css";
import "../styles/clinic-theme.css";

/**
 * Puts a staff sub-page (Add Worker, Add Vaccine, ...) inside the same sidebar
 * shell the dashboards use, so every staff screen looks and navigates alike.
 *
 * It only builds the menu from the existing page keys in App.jsx; it does not
 * add routes or logic. Clicking an item calls onNavigate(<page key>).
 *
 * Props
 *  - role:       "admin" | "clinicAdmin" | "worker"
 *  - activeKey:  menu item to highlight (see MENUS below)
 *  - user:       the logged-in user object (name is shown in the profile card)
 *  - onNavigate: (pageKey) => void   (App passes its setPage wrapper)
 *  - onLogout:   existing logout handler
 */
const MENUS = {
  admin: {
    ariaLabel: "Admin menu",
    subtitle: "Administrator",
    fallbackName: "Admin",
    profilePage: null,
    groups: [
      {
        title: "Main Menu",
        items: [
          { key: "dashboard", label: "Dashboard", icon: "dashboard", page: "dashboard" },
          { key: "addClinic", label: "Add New Clinic", icon: "building", page: "addClinic" },
        ],
      },
      {
        title: "Vaccination",
        items: [
          { key: "vaccines", label: "Manage Vaccines", icon: "syringe", page: "addVaccine" },
          {
            key: "schedules",
            label: "Manage Vaccine Schedules",
            icon: "calendar",
            page: "addVaccineSchedule",
          },
          { key: "campaigns", label: "Vaccine Campaigns", icon: "megaphone", page: "addCampaign" },
        ],
      },
    ],
  },
  clinicAdmin: {
    ariaLabel: "Clinic admin menu",
    subtitle: "Clinic Administrator",
    fallbackName: "Clinic Admin",
    profilePage: "editProfile",
    groups: [
      {
        title: "Main Menu",
        items: [
          { key: "dashboard", label: "Dashboard", icon: "dashboard", page: "clinicDashboard" },
          { key: "editProfile", label: "Edit Profile", icon: "user", page: "editProfile" },
        ],
      },
      {
        title: "Clinic",
        items: [
          { key: "addWorker", label: "Add Worker", icon: "plus", page: "addWorker" },
          { key: "workers", label: "Workers List", icon: "users", page: "workerList" },
          { key: "duties", label: "Daily Duties", icon: "clipboard", page: "assignDuty" },
          { key: "inventory", label: "Inventory", icon: "box", page: "inventory" },
          { key: "feedback", label: "Feedback", icon: "message", page: "clinicFeedback" },
        ],
      },
    ],
  },
  worker: {
    ariaLabel: "Health worker menu",
    subtitle: "Health Worker",
    fallbackName: "Worker",
    profilePage: "editProfile",
    groups: [
      {
        title: "Main Menu",
        items: [
          { key: "dashboard", label: "Dashboard", icon: "dashboard", page: "workerDashboard" },
          { key: "editProfile", label: "Edit Profile", icon: "user", page: "editProfile" },
        ],
      },
      {
        title: "Vaccination",
        items: [
          { key: "appointments", label: "Appointments", icon: "calendar", page: "workerAppointments" },
          { key: "guestCheckIn", label: "Campaign Check-in", icon: "idcard", page: "guestCheckIn" },
          { key: "logDose", label: "Log Dose", icon: "syringe", page: "logDose" },
          { key: "showWork", label: "Show Work", icon: "clipboard", page: "showWork" },
        ],
      },
    ],
  },
};

function StaffShell({ role, activeKey, user, onNavigate, onLogout, children }) {
  const { t } = useLanguage();
  const scopeRef = useRef(null);
  const menu = MENUS[role] || MENUS.admin;

  useTilt(scopeRef);

  const groups = menu.groups.map((group) => ({
    title: group.title,
    items: group.items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      onClick: () => onNavigate?.(item.page),
    })),
  }));

  return (
    <DashboardLayout
      ariaLabel={t(menu.ariaLabel)}
      user={{ name: user?.name || menu.fallbackName, subtitle: t(menu.subtitle) }}
      onProfileClick={menu.profilePage ? () => onNavigate?.(menu.profilePage) : undefined}
      groups={groups}
      activeKey={activeKey}
      onLogout={role === "admin" ? undefined : onLogout}
      shellClass={role === "clinicAdmin" ? "cz-shell--clinic" : ""}
    >
      <div className="fx-scope" ref={scopeRef}>
        {children}
      </div>
    </DashboardLayout>
  );
}

export default StaffShell;
