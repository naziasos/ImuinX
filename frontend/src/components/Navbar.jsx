import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:5000";

function Navbar({ page, setPage }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const navItems = [
    { label: "Home", value: "home" },
    { label: "Who it's for", value: "whoFor", section: "who-its-for" },
    { label: "About", value: "about" },
    { label: "Services", value: "services" },
    { label: "Verify", value: "verifyCertificate" },
  ];

  // Get JWT token from localStorage
  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt")
    );
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotificationLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Notification fetch error:", error);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  // Fetch notifications when Navbar loads
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNavigation = (value) => {
    setPage(value);
    setMobileMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: value === page ? "smooth" : "auto",
    });
  };

  const goToSection = (id) => {
    setMobileMenuOpen(false);

    const scroll = () =>
      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

    if (page === "home") {
      scroll();
    } else {
      setPage("home");
      setTimeout(scroll, 150);
    }
  };

  // Open / close notification dropdown
  const handleNotificationClick = () => {
    setNotificationOpen((previous) => !previous);

    // Refresh notification data whenever bell is opened
    if (!notificationOpen) {
      fetchNotifications();
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update UI immediately
      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );

      setUnreadCount((previousCount) =>
        Math.max(0, previousCount - 1)
      );
    } catch (error) {
      console.error("Mark notification as read error:", error);
    }
  };

  // Format notification time
  const formatNotificationTime = (date) => {
    if (!date) return "";

    const notificationDate = new Date(date);

    if (Number.isNaN(notificationDate.getTime())) {
      return "";
    }

    return notificationDate.toLocaleString();
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <button
            onClick={() => handleNavigation("home")}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <span className="text-white text-xl font-extrabold">
                I
              </span>

              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">
                  +
                </span>
              </span>
            </div>

            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
                Imuin<span className="text-blue-600">X</span>
              </h1>

              <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                Vaccination Management
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">

            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() =>
                  item.section
                    ? goToSection(item.section)
                    : handleNavigation(item.value)
                }
                className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  page === item.value
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                }`}
              >
                {item.label}

                {page === item.value && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}

            <div className="h-7 w-px bg-slate-200 mx-3" />

            {/* Register */}
            <button
              onClick={() => handleNavigation("register")}
              className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                page === "register"
                  ? "text-blue-600 bg-blue-50 border-blue-200"
                  : "text-slate-700 border-slate-200 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              Register
            </button>

            {/* Login */}
            <button
              onClick={() => handleNavigation("login")}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-md shadow-blue-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/40 active:translate-y-0 active:scale-95 transition-all duration-200"
            >
              Login
            </button>

            {/* ================= NOTIFICATION ================= */}
            <div className="relative ml-2">

              <button
                onClick={handleNotificationClick}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                aria-label="Notifications"
              >
                {/* Bell icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.5-1.5A2 2 0 0118 14v-3a6 6 0 10-12 0v3a2 2 0 01-.5 1.5L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>

                {/* Unread badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationOpen && (
                <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100]">

                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        Notifications
                      </h3>

                      <p className="text-xs text-slate-400 mt-0.5">
                        {unreadCount > 0
                          ? `${unreadCount} unread`
                          : "You're all caught up"}
                      </p>
                    </div>

                    <button
                      onClick={fetchNotifications}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Notification content */}
                  <div className="max-h-96 overflow-y-auto">

                    {notificationLoading ? (
                      <div className="px-5 py-10 text-center text-sm text-slate-400">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <div className="text-3xl mb-2">
                          🔔
                        </div>

                        <p className="text-sm font-semibold text-slate-600">
                          No notifications
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          You're all caught up!
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification._id}
                          onClick={() =>
                            !notification.isRead &&
                            markAsRead(notification._id)
                          }
                          className={`w-full text-left px-5 py-4 border-b border-slate-100 transition ${
                            notification.isRead
                              ? "bg-white hover:bg-slate-50"
                              : "bg-blue-50/60 hover:bg-blue-50"
                          }`}
                        >
                          <div className="flex gap-3">

                            {/* Unread indicator */}
                            <div className="pt-1.5">
                              <span
                                className={`block w-2.5 h-2.5 rounded-full ${
                                  notification.isRead
                                    ? "bg-slate-200"
                                    : "bg-blue-600"
                                }`}
                              />
                            </div>

                            <div className="flex-1 min-w-0">

                              <div className="flex items-start justify-between gap-2">

                                <p
                                  className={`text-sm ${
                                    notification.isRead
                                      ? "font-medium text-slate-600"
                                      : "font-bold text-slate-800"
                                  }`}
                                >
                                  {notification.message}
                                </p>

                              </div>

                              <div className="flex items-center gap-2 mt-2">

                                <span className="text-[11px] text-slate-400">
                                  {formatNotificationTime(
                                    notification.createdAt
                                  )}
                                </span>

                                {!notification.isRead && (
                                  <span className="text-[10px] font-bold text-blue-600">
                                    New
                                  </span>
                                )}

                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-4">

            <div className="flex flex-col gap-1">

              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() =>
                    item.section
                      ? goToSection(item.section)
                      : handleNavigation(item.value)
                  }
                  className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    page === item.value
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => handleNavigation("register")}
                className="text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Register
              </button>

              <button
                onClick={() => handleNavigation("login")}
                className="mt-2 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-md shadow-blue-500/30 active:scale-95 transition"
              >
                Login
              </button>

            </div>
          </div>
        )}

      </div>
    </nav>
  );
}

export default Navbar;