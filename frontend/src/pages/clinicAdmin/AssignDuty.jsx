import React, { useEffect, useMemo, useState } from "react";
import "./AssignDuty.css";

/* =====================================================
   ICONS (inline SVG, no extra dependency)
===================================================== */

const ICON_PATHS = {
  syringe: (
    <>
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" />
      <path d="m5 19-3 3" />
      <path d="m14 4 6 6" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
    </>
  ),
  calendarCheck: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
      <path d="m9 15.2 2 2 4-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  swap: (
    <>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h14a4 4 0 0 1 4 4" />
      <path d="m17 20 4-4-4-4" />
      <path d="M21 16H7a4 4 0 0 1-4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10" rx="3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
};

const Icon = ({ name, size = 18 }) => (
  <svg
    className="ad-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[name]}
  </svg>
);

/* =====================================================
   HELPERS
===================================================== */

const DUTY_META = {
  Vaccination: {
    tone: "vaccine",
    icon: "syringe",
    hint: "Clinic vaccination session",
  },
  "In-House Visit": {
    tone: "visit",
    icon: "home",
    hint: "Visit citizens at home",
  },
};

const dutyMeta = (type) =>
  DUTY_META[type] || { tone: "other", icon: "calendar", hint: "" };

const pad = (n) => String(n).padStart(2, "0");

// Duty dates are stored at UTC midnight, so we compare using the UTC date key.
const dutyKey = (duty) => {
  if (!duty?.dutyDate) return "";
  const parsed = new Date(duty.dutyDate);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const localTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const keyToUtc = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

const dayDiff = (key, todayKey) =>
  Math.round((keyToUtc(key) - keyToUtc(todayKey)) / 86400000);

const fmt = (key, options) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(keyToUtc(key))
  );

const relativeLabel = (diff) => {
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 60) return `In ${diff} days`;
  if (diff < -1 && diff >= -60) return `${Math.abs(diff)} days ago`;
  return "";
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const avatarTone = (seed = "") =>
  [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;

const Avatar = ({ name, size = "md" }) => (
  <span
    className={`ad-avatar ad-avatar-${size} ad-avatar-tone-${avatarTone(name)}`}
    aria-hidden="true"
  >
    {initials(name)}
  </span>
);

/* =====================================================
   COMPONENT
===================================================== */

const AssignDuty = () => {
  const [workers, setWorkers] = useState([]);
  const [assignedDuties, setAssignedDuties] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDuty, setSelectedDuty] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workerQuery, setWorkerQuery] = useState("");
  const [recent, setRecent] = useState(null);

  // Reassign dialog: the duty being replaced + the chosen replacement
  const [reassignDuty, setReassignDuty] = useState(null);
  const [replacementId, setReplacementId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState("");

  const [loading, setLoading] = useState(true);
  const [dutiesLoading, setDutiesLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const dutyTypes = ["Vaccination", "In-House Visit"];
  const todayKey = localTodayKey();

  // =====================================================
  // FETCH WORKERS
  // =====================================================

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/workers",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch workers");
      }

      setWorkers(data.workers || []);
    } catch (error) {
      console.error("Error fetching workers:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH ALL ASSIGNED DUTIES
  // =====================================================

  const fetchAssignedDuties = async () => {
    try {
      setDutiesLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/duties",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch assigned duties");
      }

      setAssignedDuties(data.duties || []);
    } catch (error) {
      console.error("Error fetching assigned duties:", error);
      setAssignedDuties([]);
    } finally {
      setDutiesLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchAssignedDuties();
  }, []);

  // Fade the "just assigned" highlight after a few seconds
  useEffect(() => {
    if (!recent) return undefined;
    const timer = setTimeout(() => setRecent(null), 4500);
    return () => clearTimeout(timer);
  }, [recent]);

  // =====================================================
  // CHECK EXISTING ASSIGNMENTS FOR SELECTED DATE
  // =====================================================

  const selectedDateDuties = assignedDuties.filter(
    (duty) => selectedDate && dutyKey(duty) === selectedDate
  );

  const getWorkerDutyOnDate = (workerId) =>
    selectedDateDuties.find((duty) => duty.workerId?._id === workerId);

  const isWorkerAlreadyAssigned = (workerId) =>
    Boolean(getWorkerDutyOnDate(workerId));

  // =====================================================
  // SEARCH + FILTER ASSIGNMENTS
  // =====================================================

  const searchedDuties = assignedDuties.filter((duty) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;

    const key = dutyKey(duty);
    const dateText = key
      ? `${fmt(key, { day: "2-digit", month: "2-digit", year: "numeric" })} ${fmt(
          key,
          { weekday: "long", day: "numeric", month: "long", year: "numeric" }
        )}`
      : "";

    return (
      (duty.workerId?.name || "").toLowerCase().includes(search) ||
      (duty.workerId?.email || "").toLowerCase().includes(search) ||
      (duty.dutyType || "").toLowerCase().includes(search) ||
      dateText.toLowerCase().includes(search)
    );
  });

  const upcomingCount = searchedDuties.filter(
    (duty) => dutyKey(duty) && dutyKey(duty) >= todayKey
  ).length;
  const pastCount = searchedDuties.length - upcomingCount;

  const filteredDuties = searchedDuties.filter((duty) => {
    const key = dutyKey(duty);
    if (statusFilter === "upcoming") return key && key >= todayKey;
    if (statusFilter === "past") return !key || key < todayKey;
    return true;
  });

  // Group by day: today & future first (soonest first), then past (latest first)
  const groupedDuties = useMemo(() => {
    const map = new Map();

    filteredDuties.forEach((duty) => {
      const key = dutyKey(duty) || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(duty);
    });

    const keys = [...map.keys()];
    const upcoming = keys.filter((k) => k !== "unknown" && k >= todayKey).sort();
    const past = keys
      .filter((k) => k !== "unknown" && k < todayKey)
      .sort()
      .reverse();
    const unknown = keys.filter((k) => k === "unknown");

    return [...upcoming, ...past, ...unknown].map((key) => ({
      key,
      duties: map.get(key),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedDuties, searchTerm, statusFilter, todayKey]);

  // =====================================================
  // BANNER STATS
  // =====================================================

  const onDutyToday = assignedDuties.filter(
    (duty) => dutyKey(duty) === todayKey
  ).length;

  const nextSevenDays = assignedDuties.filter((duty) => {
    const key = dutyKey(duty);
    if (!key) return false;
    const diff = dayDiff(key, todayKey);
    return diff >= 1 && diff <= 7;
  }).length;

  // =====================================================
  // WORKER PICKER
  // =====================================================

  const visibleWorkers = workers.filter((worker) => {
    const q = workerQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (worker.name || "").toLowerCase().includes(q) ||
      (worker.email || "").toLowerCase().includes(q)
    );
  });

  const chosenWorker = workers.find((worker) => worker._id === selectedWorker);
  const readyToAssign = selectedDate && selectedDuty && selectedWorker;

  // =====================================================
  // ASSIGN DUTY
  // =====================================================

  const handleAssign = async () => {
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    if (!selectedDuty) {
      alert("Please select a duty.");
      return;
    }

    if (!selectedWorker) {
      alert("Please select a worker.");
      return;
    }

    if (isWorkerAlreadyAssigned(selectedWorker)) {
      alert(
        `${chosenWorker?.name || "This worker"} is already assigned to a duty on this date.`
      );
      return;
    }

    try {
      setAssigning(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/duties",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workerId: selectedWorker,
            dutyDate: selectedDate,
            dutyType: selectedDuty,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to assign duty");
      }

      alert("Duty assigned successfully!");

      // Remember what was just added so the list can highlight it
      setRecent({ workerId: selectedWorker, key: selectedDate });

      // Clear the form
      setSelectedDate("");
      setSelectedDuty("");
      setSelectedWorker("");
      setWorkerQuery("");

      // Refresh the assignments list
      await fetchAssignedDuties();
    } catch (error) {
      console.error("Error assigning duty:", error);
      alert(error.message);
    } finally {
      setAssigning(false);
    }
  };

  // =====================================================
  // REASSIGN DUTY (worker absent / on leave)
  // =====================================================

  const openReassign = (duty) => {
    setReassignDuty(duty);
    setReplacementId("");
    setReassignError("");
  };

  const closeReassign = () => {
    if (reassigning) return;
    setReassignDuty(null);
    setReplacementId("");
    setReassignError("");
  };

  // Workers who are free on the duty's day (and not the current worker)
  const replacementCandidates = reassignDuty
    ? workers.filter((worker) => {
        if (worker._id === reassignDuty.workerId?._id) return false;
        const day = dutyKey(reassignDuty);
        return !assignedDuties.some(
          (duty) =>
            dutyKey(duty) === day && duty.workerId?._id === worker._id
        );
      })
    : [];

  const handleReassign = async () => {
    if (!reassignDuty || !replacementId) return;

    try {
      setReassigning(true);
      setReassignError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/clinics/my-clinic/duties/${reassignDuty._id}/reassign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newWorkerId: replacementId }),
        }
      );

      // The server answers with HTML (not JSON) if the reassign route does not
      // exist, e.g. the backend was not restarted after the update.
      const data = await response.json().catch(() => null);

      if (!data) {
        throw new Error(
          "The server did not recognise the reassign request. Please restart the backend and try again."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to reassign duty");
      }

      setRecent({ workerId: replacementId, key: dutyKey(reassignDuty) });
      setReassignDuty(null);
      setReplacementId("");

      await fetchAssignedDuties();
    } catch (error) {
      console.error("Error reassigning duty:", error);
      setReassignError(error.message);
    } finally {
      setReassigning(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const filterTabs = [
    { id: "all", label: "All", count: searchedDuties.length },
    { id: "upcoming", label: "Upcoming", count: upcomingCount },
    { id: "past", label: "Past", count: pastCount },
  ];

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="assign-duty-main">
      {/* =====================================================
          BANNER
      ===================================================== */}

      <header className="assign-duty-banner">
        <svg
          className="assign-duty-ecg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            pathLength="1"
            d="M0 70 H220 L240 70 L256 40 L272 96 L292 8 L312 112 L330 70 H560 L576 70 L590 52 L604 82 L616 70 H900 L920 70 L936 40 L952 96 L972 8 L992 112 L1010 70 H1200"
          />
        </svg>

        <div className="assign-duty-banner-body">
          <div className="assign-duty-banner-text">
            <p className="assign-duty-breadcrumb">
              Clinic Admin / Daily Duties
            </p>

            <h1>Assign Daily Clinic Duty</h1>

            <p className="assign-duty-description">
              See who is on duty and schedule vaccination or in-house visit
              shifts for your team.
            </p>
          </div>

          <dl className="assign-duty-stats">
            <div className="assign-duty-stat">
              <dt>On duty today</dt>
              <dd>{dutiesLoading ? "–" : onDutyToday}</dd>
            </div>

            <div className="assign-duty-stat">
              <dt>Next 7 days</dt>
              <dd>{dutiesLoading ? "–" : nextSevenDays}</dd>
            </div>

            <div className="assign-duty-stat">
              <dt>Team members</dt>
              <dd>{loading ? "–" : workers.length}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* =====================================================
          TWO COLUMNS: LIST (left) + ASSIGN (right)
      ===================================================== */}

      <div className="assign-duty-layout">
        {/* ---------------- LEFT: ASSIGNED DUTIES ---------------- */}

        <section className="assign-duty-list-card">
          <div className="assign-duty-card-head">
            <div>
              <h2>Assigned duties</h2>
              <p>
                {dutiesLoading
                  ? "Loading the schedule…"
                  : `${assignedDuties.length} scheduled across your team`}
              </p>
            </div>
          </div>

          <div className="assign-duty-toolbar">
            <div className="assign-duty-search">
              <Icon name="search" size={17} />
              <input
                type="text"
                placeholder="Search by date, duty or worker name"
                aria-label="Search assigned duties"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="assign-duty-search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm("")}
                >
                  <Icon name="x" size={15} />
                </button>
              )}
            </div>

            <div
              className="assign-duty-tabs"
              role="tablist"
              aria-label="Filter duties"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.id}
                  className={`assign-duty-tab ${
                    statusFilter === tab.id ? "is-active" : ""
                  }`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                  <span>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {dutiesLoading ? (
            <div className="assign-duty-skeletons" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div className="assign-duty-skeleton" key={i}>
                  <span className="ad-skel ad-skel-tile" />
                  <span className="ad-skel ad-skel-line" />
                </div>
              ))}
            </div>
          ) : groupedDuties.length === 0 ? (
            <div className="assign-duty-empty">
              <div className="assign-duty-empty-icon">
                <Icon name="calendarCheck" size={28} />
              </div>

              {searchTerm || statusFilter !== "all" ? (
                <>
                  <h3>No matching assignments</h3>
                  <p>Try a different search or filter.</p>
                  <button
                    type="button"
                    className="assign-duty-link-btn"
                    onClick={clearFilters}
                  >
                    Clear search and filters
                  </button>
                </>
              ) : (
                <>
                  <h3>No duties scheduled yet</h3>
                  <p>Pick a date in the panel to assign the first duty.</p>
                </>
              )}
            </div>
          ) : (
            <div className="assign-duty-groups">
              {groupedDuties.map(({ key, duties }) => {
                const known = key !== "unknown";
                const diff = known ? dayDiff(key, todayKey) : null;
                const relative = known ? relativeLabel(diff) : "";
                const isToday = diff === 0;
                const isPast = known && diff < 0;
                const isSelectedDay = known && key === selectedDate;

                return (
                  <article
                    key={key}
                    className={`assign-duty-group ${
                      isToday ? "is-today" : ""
                    } ${isPast ? "is-past" : ""} ${
                      isSelectedDay ? "is-selected-day" : ""
                    }`}
                  >
                    <div className="assign-duty-group-head">
                      <div className="assign-duty-date-tile">
                        <span>
                          {known ? fmt(key, { month: "short" }) : "–"}
                        </span>
                        <strong>
                          {known ? fmt(key, { day: "numeric" }) : "?"}
                        </strong>
                      </div>

                      <div className="assign-duty-group-title">
                        <h3>
                          {known
                            ? fmt(key, { weekday: "long" })
                            : "Date unavailable"}
                        </h3>
                        <p>
                          {known
                            ? fmt(key, {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "These duties have no valid date"}
                        </p>
                      </div>

                      <div className="assign-duty-group-meta">
                        {relative && (
                          <span
                            className={`assign-duty-when ${
                              isToday ? "is-today" : ""
                            }`}
                          >
                            {isToday && <i aria-hidden="true" />}
                            {relative}
                          </span>
                        )}
                        <span className="assign-duty-group-count">
                          {duties.length}{" "}
                          {duties.length === 1 ? "worker" : "workers"}
                        </span>
                      </div>
                    </div>

                    <ul className="assign-duty-rows">
                      {duties.map((duty) => {
                        const meta = dutyMeta(duty.dutyType);
                        const worker = duty.workerId;
                        const isRecent =
                          recent &&
                          worker?._id === recent.workerId &&
                          key === recent.key;

                        return (
                          <li
                            key={duty._id}
                            className={`assign-duty-row ${
                              isRecent ? "is-new" : ""
                            }`}
                          >
                            <Avatar name={worker?.name || "?"} />

                            <div className="assign-duty-row-main">
                              <strong>
                                {worker?.name || "Worker not found"}
                              </strong>
                              {worker?.email && <span>{worker.email}</span>}
                            </div>

                            {isRecent && (
                              <span className="assign-duty-new-badge">
                                Just added
                              </span>
                            )}

                            <span
                              className={`assign-duty-chip assign-duty-chip-${meta.tone}`}
                            >
                              <Icon name={meta.icon} size={14} />
                              {duty.dutyType}
                            </span>

                            {!isPast && (
                              <button
                                type="button"
                                className="assign-duty-reassign"
                                onClick={() => openReassign(duty)}
                                title="Give this duty to another worker"
                              >
                                <Icon name="swap" size={14} />
                                Reassign
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------------- RIGHT: ASSIGN FORM ---------------- */}

        <aside className="assign-duty-form-card">
          <div className="assign-duty-card-head">
            <div>
              <h2>Assign a new duty</h2>
              <p>Three quick steps. Each worker can take one duty per day.</p>
            </div>
          </div>

          {/* STEP 1: DATE */}

          <div className="assign-duty-step">
            <div className="assign-duty-step-head">
              <span
                className={`assign-duty-step-num ${
                  selectedDate ? "is-done" : "is-current"
                }`}
              >
                {selectedDate ? <Icon name="check" size={14} /> : 1}
              </span>
              <label htmlFor="duty-date">Pick a date</label>
            </div>

            <input
              id="duty-date"
              type="date"
              className="assign-duty-input"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedDuty("");
                setSelectedWorker("");
              }}
            />

            {selectedDate && (
              <p className="assign-duty-step-note">
                <Icon name="users" size={15} />
                {selectedDateDuties.length === 0
                  ? "No one is on duty this day yet."
                  : `${selectedDateDuties.length} of ${workers.length} workers already on duty.`}
              </p>
            )}
          </div>

          {/* STEP 2: DUTY */}

          <div
            className={`assign-duty-step ${!selectedDate ? "is-locked" : ""}`}
          >
            <div className="assign-duty-step-head">
              <span
                className={`assign-duty-step-num ${
                  selectedDuty
                    ? "is-done"
                    : selectedDate
                    ? "is-current"
                    : ""
                }`}
              >
                {selectedDuty ? <Icon name="check" size={14} /> : 2}
              </span>
              <span
                className="assign-duty-step-title"
                id="duty-type-label"
              >
                Choose the duty
              </span>
            </div>

            <div
              className="assign-duty-duty-grid"
              role="radiogroup"
              aria-labelledby="duty-type-label"
            >
              {dutyTypes.map((dutyType) => {
                const meta = dutyMeta(dutyType);
                const checked = selectedDuty === dutyType;

                return (
                  <label
                    key={dutyType}
                    className={`assign-duty-duty assign-duty-duty-${meta.tone} ${
                      checked ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="duty-type"
                      value={dutyType}
                      checked={checked}
                      disabled={!selectedDate}
                      onChange={() => setSelectedDuty(dutyType)}
                    />
                    <span className="assign-duty-duty-icon">
                      <Icon name={meta.icon} size={20} />
                    </span>
                    <strong>{dutyType}</strong>
                    <small>{meta.hint}</small>
                  </label>
                );
              })}
            </div>
          </div>

          {/* STEP 3: WORKER */}

          <div
            className={`assign-duty-step ${
              !selectedDate || !selectedDuty ? "is-locked" : ""
            }`}
          >
            <div className="assign-duty-step-head">
              <span
                className={`assign-duty-step-num ${
                  selectedWorker
                    ? "is-done"
                    : selectedDate && selectedDuty
                    ? "is-current"
                    : ""
                }`}
              >
                {selectedWorker ? <Icon name="check" size={14} /> : 3}
              </span>
              <span
                className="assign-duty-step-title"
                id="duty-worker-label"
              >
                Select a worker
              </span>
            </div>

            {workers.length > 5 && (
              <div className="assign-duty-search assign-duty-search-small">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Find a worker"
                  aria-label="Find a worker"
                  value={workerQuery}
                  disabled={!selectedDate || !selectedDuty}
                  onChange={(e) => setWorkerQuery(e.target.value)}
                />
              </div>
            )}

            <div
              className="assign-duty-workers"
              role="radiogroup"
              aria-labelledby="duty-worker-label"
            >
              {loading ? (
                <p className="assign-duty-workers-empty">Loading workers…</p>
              ) : workers.length === 0 ? (
                <p className="assign-duty-workers-empty">
                  No workers in this clinic yet. Add workers first, then come
                  back to assign duties.
                </p>
              ) : visibleWorkers.length === 0 ? (
                <p className="assign-duty-workers-empty">
                  No workers match “{workerQuery}”.
                </p>
              ) : (
                visibleWorkers.map((worker) => {
                  const existing = getWorkerDutyOnDate(worker._id);
                  const taken = Boolean(existing);
                  const checked = selectedWorker === worker._id;
                  const locked = !selectedDate || !selectedDuty;

                  return (
                    <label
                      key={worker._id}
                      className={`assign-duty-worker ${
                        checked ? "is-selected" : ""
                      } ${taken ? "is-taken" : ""}`}
                    >
                      <input
                        type="radio"
                        name="duty-worker"
                        value={worker._id}
                        checked={checked}
                        disabled={locked || taken}
                        onChange={() => setSelectedWorker(worker._id)}
                      />

                      <Avatar name={worker.name} />

                      <div className="assign-duty-worker-info">
                        <strong>{worker.name}</strong>
                        <p>{worker.email}</p>
                      </div>

                      {taken ? (
                        <span className="assign-duty-worker-tag">
                          <Icon name="lock" size={12} />
                          {existing.dutyType}
                        </span>
                      ) : (
                        <span className="assign-duty-worker-check">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* SUMMARY + ACTION */}

          <div className="assign-duty-summary">
            {readyToAssign ? (
              <p>
                <strong>{chosenWorker?.name}</strong> will take{" "}
                <strong>{selectedDuty}</strong> on{" "}
                <strong>
                  {fmt(selectedDate, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
                .
              </p>
            ) : (
              <p className="is-hint">
                Complete the steps above to review the assignment.
              </p>
            )}

            <button
              type="button"
              className="assign-duty-submit"
              onClick={handleAssign}
              disabled={assigning || !readyToAssign}
            >
              {assigning ? (
                <>
                  <span className="assign-duty-btn-spinner" />
                  Assigning…
                </>
              ) : (
                <>
                  <Icon name="check" size={17} />
                  Assign Worker
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* =====================================================
          REASSIGN DIALOG
      ===================================================== */}

      {reassignDuty && (
        <div
          className="assign-duty-modal-overlay"
          onClick={closeReassign}
          role="presentation"
        >
          <div
            className="assign-duty-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reassign-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reassign-title">Reassign duty</h3>
            <p>
              <strong>{reassignDuty.dutyType}</strong> on{" "}
              {fmt(dutyKey(reassignDuty), {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              is currently assigned to{" "}
              <strong>{reassignDuty.workerId?.name || "a worker"}</strong>.
              Pick who takes it over.
            </p>

            {replacementCandidates.length === 0 ? (
              <div className="assign-duty-modal-empty">
                Every other worker already has a duty on this day.
              </div>
            ) : (
              <div
                className="assign-duty-modal-list"
                role="radiogroup"
                aria-label="Replacement worker"
              >
                {replacementCandidates.map((worker) => (
                  <label
                    key={worker._id}
                    className={`assign-duty-modal-option ${
                      replacementId === worker._id ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="replacement-worker"
                      value={worker._id}
                      checked={replacementId === worker._id}
                      onChange={() => setReplacementId(worker._id)}
                    />
                    <Avatar name={worker.name} />
                    <span>
                      <strong>{worker.name}</strong>
                      <small>{worker.email}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <p className="assign-duty-modal-note">
              {reassignDuty.workerId?.name || "The current worker"} will be
              removed from this duty.
            </p>

            {reassignError && (
              <p className="assign-duty-modal-error" role="alert">
                {reassignError}
              </p>
            )}

            <div className="assign-duty-modal-actions">
              <button
                type="button"
                onClick={closeReassign}
                disabled={reassigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={handleReassign}
                disabled={reassigning || !replacementId}
              >
                {reassigning ? "Reassigning…" : "Confirm reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AssignDuty;
