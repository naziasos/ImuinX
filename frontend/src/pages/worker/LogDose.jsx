import { useEffect, useRef, useState } from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";
import "./LogDose.css";

import { api, errorMessage } from "../../services/api";

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(
    d.getTime() - offset * 60 * 1000
  );

  return local.toISOString().slice(0, 10);
}

function calcAge(dob) {
  if (!dob) return null;

  const birth = new Date(dob);

  if (isNaN(birth.getTime())) {
    return null;
  }

  const now = new Date();

  let years =
    now.getFullYear() -
    birth.getFullYear();

  const months =
    now.getMonth() -
    birth.getMonth();

  if (
    months < 0 ||
    (months === 0 &&
      now.getDate() < birth.getDate())
  ) {
    years -= 1;
  }

  if (years < 1) {
    const totalMonths =
      (now.getFullYear() -
        birth.getFullYear()) *
        12 +
      (now.getMonth() -
        birth.getMonth());

    return `${Math.max(
      totalMonths,
      0
    )} mo`;
  }

  return `${years} yr`;
}

function getAgeInDays(dob) {
  if (!dob) return null;

  const birth = new Date(dob);

  if (isNaN(birth.getTime())) {
    return null;
  }

  const now = new Date();

  const difference =
    now.getTime() -
    birth.getTime();

  return Math.max(
    0,
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    )
  );
}

function ageLabel(days) {
  if (days === null) {
    return "Age not available";
  }

  if (days <= 0) {
    return "Birth";
  }

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    }`;
  }

  if (days < 30) {
    const weeks = Math.floor(
      days / 7
    );

    return `${weeks} week${
      weeks === 1 ? "" : "s"
    }`;
  }

  if (days < 365) {
    const months = Math.floor(
      days / 30.44
    );

    return `${months} month${
      months === 1 ? "" : "s"
    }`;
  }

  const years = Math.floor(
    days / 365.25
  );

  return `${years} year${
    years === 1 ? "" : "s"
  }`;
}

function LogDose({
  onBack,
  onAppointments,
  onLogout,
  appointmentContext = null,
}) {
  const user = JSON.parse(
    localStorage.getItem("user") ||
      "null"
  );

  // --------------------------------------------------
  // Citizen
  // --------------------------------------------------

  const [citizenQuery, setCitizenQuery] =
    useState("");

  const [
    citizenResults,
    setCitizenResults,
  ] = useState([]);

  const [searching, setSearching] =
    useState(false);

  const [
    showResults,
    setShowResults,
  ] = useState(false);

  const [
    selectedCitizen,
    setSelectedCitizen,
  ] = useState(null);

  const [
    doseHistory,
    setDoseHistory,
  ] = useState([]);

  // --------------------------------------------------
  // Inventory / Vaccine / Batch
  // --------------------------------------------------

  const [inventory, setInventory] =
    useState([]);

  const [
    loadingInventory,
    setLoadingInventory,
  ] = useState(true);

  const [
    schedules,
    setSchedules,
  ] = useState([]);

  const [
    loadingSchedules,
    setLoadingSchedules,
  ] = useState(true);

  const [
    vaccineId,
    setVaccineId,
  ] = useState("");

  const [
    batchNumber,
    setBatchNumber,
  ] = useState("");

  // --------------------------------------------------
  // Date
  // --------------------------------------------------

  const [
    dateAdministered,
    setDateAdministered,
  ] = useState(todayISO());

  // --------------------------------------------------
  // Form
  // --------------------------------------------------

  const [errors, setErrors] =
    useState({});

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    apiError,
    setApiError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(null);

  const heroRef =
    useRef(null);

  // --------------------------------------------------
  // Load inventory + vaccine schedules
  // --------------------------------------------------

  useEffect(() => {
    const loadDoseOptions =
      async () => {
        try {
          setLoadingInventory(true);
          setLoadingSchedules(true);

          const [
            inventoryRes,
            scheduleRes,
          ] = await Promise.all([
            api.get(
              "/vaccine-inventory/my-clinic"
            ),
            api.get(
              "/vaccine-schedules"
            ),
          ]);

          setInventory(
            inventoryRes.data
              .inventory || []
          );

          setSchedules(
            scheduleRes.data
              .schedules || []
          );
        } catch (err) {
          setApiError(
            errorMessage(err)
          );
        } finally {
          setLoadingInventory(false);
          setLoadingSchedules(false);
        }
      };

    loadDoseOptions();
  }, []);

  // --------------------------------------------------
  // Debounced citizen search
  // --------------------------------------------------

  useEffect(() => {
    if (
      citizenQuery.trim()
        .length < 2
    ) {
      setCitizenResults([]);
      return;
    }

    const handle =
      setTimeout(
        async () => {
          try {
            setSearching(true);

            const res =
              await api.get(
                "/family/search",
                {
                  params: {
                    query:
                      citizenQuery.trim(),
                  },
                }
              );

            setCitizenResults(
              res.data.citizens ||
                []
            );
          } catch (err) {
            setCitizenResults([]);
          } finally {
            setSearching(false);
          }
        },
        350
      );

    return () =>
      clearTimeout(handle);
  }, [citizenQuery]);

  // --------------------------------------------------
  // Select citizen
  // --------------------------------------------------

  const selectCitizen =
    async (citizen) => {
      setSelectedCitizen(
        citizen
      );

      setCitizenQuery(
        citizen.name
      );

      setShowResults(false);

      setErrors((prev) => ({
        ...prev,
        citizen:
          undefined,
      }));

      try {
        const res =
          await api.get(
            `/doses/citizen/${citizen._id}`,
            {
              params: {
                citizenType:
                  citizen.type,
              },
            }
          );

        setDoseHistory(
          res.data.doses || []
        );
      } catch (err) {
        setDoseHistory([]);
      }
    };

  // --------------------------------------------------
  // Appointment context
  // --------------------------------------------------

  useEffect(() => {
    if (!appointmentContext) {
      return;
    }

    const appointmentPatient =
      appointmentContext.familyProfileId
        ? {
            _id:
              appointmentContext
                .familyProfileId
                ._id,

            type: "family",

            name:
              appointmentContext
                .familyProfileId
                .name,

            relationship:
              appointmentContext
                .familyProfileId
                .relationship,

            dateOfBirth:
              appointmentContext
                .familyProfileId
                .dateOfBirth,

            gender:
              appointmentContext
                .familyProfileId
                .gender,

            guardianId:
              appointmentContext
                .citizenId,
          }
        : {
            _id:
              appointmentContext
                .citizenId
                ?._id,

            type: "user",

            name:
              appointmentContext
                .citizenId
                ?.name,

            relationship:
              "Self (registered citizen)",

            dateOfBirth:
              appointmentContext
                .citizenId
                ?.dateOfBirth ||
              null,

            gender: null,

            guardianId: null,
          };

    if (
      appointmentPatient._id
    ) {
      selectCitizen(
        appointmentPatient
      );
    }

    // -----------------------------------------------
    // Automatically select appointment vaccine
    // -----------------------------------------------

    const appointmentVaccine =
      appointmentContext.vaccineId;

    if (
      appointmentVaccine?._id
    ) {
      setVaccineId(
        String(
          appointmentVaccine._id
        )
      );

      setBatchNumber("");

      setErrors((prev) => ({
        ...prev,
        vaccineType:
          undefined,
        batchNumber:
          undefined,
      }));
    }
  }, [
    appointmentContext,
  ]);

  // --------------------------------------------------
  // Clear citizen
  // --------------------------------------------------

  const clearCitizen = () => {
    setSelectedCitizen(null);
    setCitizenQuery("");
    setDoseHistory([]);

    if (!appointmentContext) {
      setVaccineId("");
      setBatchNumber("");
    }
  };

  // --------------------------------------------------
  // Usable inventory
  // --------------------------------------------------

  const usableInventory =
    inventory.filter(
      (item) =>
        item.quantity > 0 &&
        item.vaccineId?._id &&
        new Date(
          item.expiryDate
        ) > new Date()
    );

  // --------------------------------------------------
  // Selected citizen age
  // --------------------------------------------------

  const selectedAgeDays =
    getAgeInDays(
      selectedCitizen?.dateOfBirth
    );

  // --------------------------------------------------
  // Age eligible schedules
  // --------------------------------------------------

  const eligibleSchedules =
    selectedAgeDays === null
      ? []
      : schedules.filter(
          (schedule) => {
            const minAge =
              Number(
                schedule.minAgeDays ||
                  0
              );

            const maxAge =
              schedule.maxAgeDays ===
                null ||
              schedule.maxAgeDays ===
                undefined
                ? Infinity
                : Number(
                    schedule.maxAgeDays
                  );

            return (
              selectedAgeDays >=
                minAge &&
              selectedAgeDays <=
                maxAge
            );
          }
        );

  const eligibleVaccineIds =
    new Set(
      eligibleSchedules
        .map(
          (schedule) =>
            schedule.vaccineId
              ?._id
        )
        .filter(Boolean)
        .map(String)
    );

  // --------------------------------------------------
  // Group inventory by vaccine
  // --------------------------------------------------

  const availableVaccineGroups =
    usableInventory.reduce(
      (groups, item) => {
        if (
          !item.vaccineId?._id
        ) {
          return groups;
        }

        const id = String(
          item.vaccineId._id
        );

        // If appointment has a vaccine,
        // only show that vaccine.
        if (
          appointmentContext
            ?.vaccineId?._id
        ) {
          if (
            id !==
            String(
              appointmentContext
                .vaccineId._id
            )
          ) {
            return groups;
          }
        }

        // Manual Log Dose:
        // filter according to age.
        else if (
          selectedAgeDays !==
            null &&
          eligibleVaccineIds.size >
            0 &&
          !eligibleVaccineIds.has(
            id
          )
        ) {
          return groups;
        }

        if (!groups[id]) {
          groups[id] = {
            vaccineId:
              item.vaccineId._id,

            name:
              item.vaccineId.name,

            code:
              item.vaccineId.code,

            batches: [],
          };
        }

        groups[id].batches.push(
          item
        );

        return groups;
      },
      {}
    );

  const availableVaccines =
    Object.values(
      availableVaccineGroups
    );

  // --------------------------------------------------
  // Selected vaccine
  // --------------------------------------------------

  const selectedVaccine =
    availableVaccines.find(
      (vaccine) =>
        String(
          vaccine.vaccineId
        ) ===
        String(vaccineId)
    );

  // --------------------------------------------------
  // Available batches
  // --------------------------------------------------

  const availableBatches =
    selectedVaccine?.batches ||
    [];

  const selectedBatchInfo =
    availableBatches.find(
      (batch) =>
        batch.batchNumber ===
        batchNumber
    );

  // --------------------------------------------------
  // Select vaccine
  // --------------------------------------------------

  const handleVaccineSelect =
    (id) => {
      setVaccineId(
        String(id)
      );

      setBatchNumber("");

      setErrors((prev) => ({
        ...prev,
        vaccineType:
          undefined,
        batchNumber:
          undefined,
      }));
    };

  // --------------------------------------------------
  // Select batch
  // --------------------------------------------------

  const handleBatchSelect =
    (number) => {
      setBatchNumber(number);

      setErrors((prev) => ({
        ...prev,
        batchNumber:
          undefined,
      }));
    };

  // --------------------------------------------------
  // Date
  // --------------------------------------------------

  const handleDateChange =
    (e) => {
      setDateAdministered(
        e.target.value
      );

      setErrors((prev) => ({
        ...prev,
        dateAdministered:
          undefined,
      }));
    };

  // --------------------------------------------------
  // Validation
  // --------------------------------------------------

  const validate = () => {
    const next = {};

    if (!selectedCitizen) {
      next.citizen =
        "Select a citizen to log this dose for.";
    }

    if (!vaccineId) {
      next.vaccineType =
        "Choose a vaccine.";
    }

    if (!batchNumber) {
      next.batchNumber =
        "Choose a batch.";
    }

    if (!dateAdministered) {
      next.dateAdministered =
        "Select the date the dose was given.";
    } else {
      const validDate =
        /^\d{4}-\d{2}-\d{2}$/.test(
          dateAdministered
        );

      const today =
        todayISO();

      if (!validDate) {
        next.dateAdministered =
          "That date isn't valid.";
      } else if (
        dateAdministered >
        today
      ) {
        next.dateAdministered =
          "Date can't be in the future.";
      }
    }

    setErrors(next);

    return (
      Object.keys(next)
        .length === 0
    );
  };

  // --------------------------------------------------
  // Reset
  // --------------------------------------------------

  const resetForm = () => {
    clearCitizen();

    if (
      appointmentContext
        ?.vaccineId?._id
    ) {
      setVaccineId(
        String(
          appointmentContext
            .vaccineId._id
        )
      );
    } else {
      setVaccineId("");
    }

    setBatchNumber("");

    setDateAdministered(
      todayISO()
    );

    setErrors({});
  };

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setApiError("");

      if (!validate()) {
        return;
      }

      try {
        setSubmitting(true);

        const res =
          await api.post(
            "/doses",
            {
              citizenId:
                selectedCitizen._id,

              citizenType:
                selectedCitizen.type,

              vaccineId,

              batchNumber,

              dateAdministered,

              appointmentId:
                appointmentContext?._id ||
                null,
            }
          );

        // Reload citizen dose history
        const historyRes =
          await api.get(
            `/doses/citizen/${selectedCitizen._id}`,
            {
              params: {
                citizenType:
                  selectedCitizen.type,
              },
            }
          );

        setDoseHistory(
          historyRes.data.doses ||
            []
        );

        setSuccess({
          citizenName:
            selectedCitizen.name,

          vaccineType:
            selectedVaccine?.name ||
            "Vaccine",

          batchNumber,

          date:
            dateAdministered,

          message:
            res.data.message,
        });

        // Reload inventory
        const inventoryRes =
          await api.get(
            "/vaccine-inventory/my-clinic"
          );

        setInventory(
          inventoryRes.data
            .inventory || []
        );
      } catch (err) {
        setApiError(
          errorMessage(err)
        );
      } finally {
        setSubmitting(false);
      }
    };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    if (onLogout) {
      onLogout();
    }
  };

  // --------------------------------------------------
  // Hero animation
  // --------------------------------------------------

  const handleHeroMove =
    (e) => {
      const el =
        heroRef.current;

      if (!el) return;

      const rect =
        el.getBoundingClientRect();

      const x =
        (e.clientX -
          rect.left) /
          rect.width -
        0.5;

      const y =
        (e.clientY -
          rect.top) /
          rect.height -
        0.5;

      el.style.setProperty(
        "--tiltX",
        `${(-y * 6).toFixed(
          2
        )}deg`
      );

      el.style.setProperty(
        "--tiltY",
        `${(x * 8).toFixed(
          2
        )}deg`
      );
    };

  const handleHeroLeave =
    () => {
      const el =
        heroRef.current;

      if (!el) return;

      el.style.setProperty(
        "--tiltX",
        "0deg"
      );

      el.style.setProperty(
        "--tiltY",
        "0deg"
      );
    };

  // --------------------------------------------------
  // Progress
  // --------------------------------------------------

  const step1Done =
    !!selectedCitizen;

  const step2Done =
    !!vaccineId &&
    !!batchNumber;

  const step3Done =
    !!dateAdministered &&
    !errors.dateAdministered;

  return (
    <div className="clinic-dashboard">

      {/* Sidebar */}
      <aside className="clinic-sidebar">
        <div>
          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>
                ImuniX
              </strong>

              <span>
                Vaccination System
              </span>
            </div>
          </div>

          <nav className="clinic-nav">
            <p className="clinic-nav-title">
              MAIN MENU
            </p>

            <button
              className="clinic-nav-item"
              onClick={onBack}
            >
              <span>📊</span>
              Dashboard
            </button>

            <button
              className="clinic-nav-item"
              onClick={
                onAppointments
              }
            >
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item active">
              <span>💉</span>
              Log Dose
            </button>

            <p className="clinic-nav-title system-title">
              SYSTEM
            </p>

            <button className="clinic-nav-item">
              <span>⚙️</span>
              Settings
            </button>
          </nav>
        </div>

        <button
          className="clinic-logout"
          onClick={
            handleLogout
          }
        >
          <span>↪</span>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="clinic-main logdose-main">

        {/* Hero */}
        <div
          ref={heroRef}
          className="logdose-hero"
          onMouseMove={
            handleHeroMove
          }
          onMouseLeave={
            handleHeroLeave
          }
        >
          <div className="logdose-hero-glow" />

          <div className="logdose-hero-content">
            <p className="logdose-hero-eyebrow">
              HEALTH WORKER ·{" "}
              {user?.name ||
                "Worker"}
            </p>

            <h1>
              Log a Dose
            </h1>

            <p className="logdose-hero-sub">
              Record a vaccination
              against a citizen's
              profile in three quick
              steps.
            </p>
          </div>

          <div className="logdose-hero-badge">
            <div className="logdose-badge-face">
              💉
            </div>
          </div>
        </div>

        {/* Progress rail */}
        <div className="logdose-rail">

          <div
            className={`logdose-rail-step ${
              step1Done
                ? "done"
                : "pending"
            }`}
          >
            <span className="logdose-rail-dot">
              {step1Done
                ? "✓"
                : "1"}
            </span>

            Citizen
          </div>

          <div className="logdose-rail-line" />

          <div
            className={`logdose-rail-step ${
              step2Done
                ? "done"
                : "pending"
            }`}
          >
            <span className="logdose-rail-dot">
              {step2Done
                ? "✓"
                : "2"}
            </span>

            Vaccine &amp; Batch
          </div>

          <div className="logdose-rail-line" />

          <div
            className={`logdose-rail-step ${
              step3Done
                ? "done"
                : "pending"
            }`}
          >
            <span className="logdose-rail-dot">
              {step3Done
                ? "✓"
                : "3"}
            </span>

            Date &amp; Confirm
          </div>
        </div>

        {apiError && (
          <div className="clinic-error logdose-alert">
            ⚠ {apiError}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          <div className="logdose-grid">

            {/* -------------------------------- */}
            {/* Citizen panel */}
            {/* -------------------------------- */}

            <div className="logdose-panel">
              <div className="logdose-panel-inner">

                <div className="logdose-panel-head">
                  <span className="logdose-panel-icon">
                    🧑‍🤝‍🧑
                  </span>

                  <div>
                    <h3>
                      Select Citizen
                    </h3>

                    <p>
                      Search by the
                      citizen's
                      registered name.
                    </p>
                  </div>
                </div>

                {!selectedCitizen ? (
                  <div className="logdose-search">

                    <input
                      type="text"
                      className={`logdose-input ${
                        errors.citizen
                          ? "has-error"
                          : ""
                      }`}
                      placeholder="Type at least 2 letters of the name…"
                      value={
                        citizenQuery
                      }
                      onChange={(e) => {
                        setCitizenQuery(
                          e.target.value
                        );

                        setShowResults(
                          true
                        );
                      }}
                      onFocus={() =>
                        setShowResults(
                          true
                        )
                      }
                    />

                    {showResults &&
                      citizenQuery.trim()
                        .length >=
                        2 && (
                        <div className="logdose-dropdown">

                          {searching && (
                            <div className="logdose-dropdown-empty">
                              Searching…
                            </div>
                          )}

                          {!searching &&
                            citizenResults.length ===
                              0 && (
                              <div className="logdose-dropdown-empty">
                                No matching
                                citizen found.
                              </div>
                            )}

                          {!searching &&
                            citizenResults.map(
                              (c) => (
                                <button
                                  type="button"
                                  key={
                                    c._id
                                  }
                                  className="logdose-dropdown-item"
                                  onClick={() =>
                                    selectCitizen(
                                      c
                                    )
                                  }
                                >
                                  <span className="logdose-dropdown-avatar">
                                    {c.name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase()}
                                  </span>

                                  <span className="logdose-dropdown-text">
                                    <strong>
                                      {
                                        c.name
                                      }
                                    </strong>

                                    <span>
                                      {c.type ===
                                      "user"
                                        ? "Registered citizen"
                                        : `${
                                            c.relationship
                                          } · ${
                                            calcAge(
                                              c.dateOfBirth
                                            ) ||
                                            "—"
                                          }`}

                                      {c.guardianId
                                        ?.name
                                        ? ` · Guardian: ${c.guardianId.name}`
                                        : ""}
                                    </span>
                                  </span>
                                </button>
                              )
                            )}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="logdose-selected-citizen">

                    <div className="logdose-citizen-avatar">
                      {selectedCitizen.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="logdose-citizen-info">

                      <strong>
                        {
                          selectedCitizen.name
                        }
                      </strong>

                      <span>
                        {selectedCitizen.type ===
                        "user"
                          ? `Registered citizen · ${
                              calcAge(
                                selectedCitizen.dateOfBirth
                              ) ||
                              "Age unavailable"
                            }`
                          : (
                            <>
                              {
                                selectedCitizen.relationship
                              }{" "}
                              ·{" "}
                              {calcAge(
                                selectedCitizen.dateOfBirth
                              ) ||
                                "Age unavailable"}{" "}
                              old ·{" "}
                              {
                                selectedCitizen.gender
                              }
                            </>
                          )}
                      </span>

                      {selectedCitizen.guardianId
                        ?.name && (
                        <span className="logdose-citizen-guardian">
                          Guardian:{" "}
                          {
                            selectedCitizen
                              .guardianId
                              .name
                          }
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="logdose-chip-clear"
                      onClick={
                        clearCitizen
                      }
                    >
                      Change
                    </button>
                  </div>
                )}

                {errors.citizen && (
                  <p className="logdose-error-text">
                    ⚠{" "}
                    {
                      errors.citizen
                    }
                  </p>
                )}

                {selectedCitizen && (
                  <div className="logdose-history">

                    <p className="logdose-history-title">
                      Previous doses (
                      {
                        doseHistory.length
                      }
                      )
                    </p>

                    {doseHistory.length ===
                    0 ? (
                      <p className="logdose-history-empty">
                        No prior doses on
                        record.
                      </p>
                    ) : (
                      <ul>
                        {doseHistory
                          .slice(
                            0,
                            3
                          )
                          .map(
                            (d) => (
                              <li
                                key={
                                  d._id
                                }
                              >
                                <strong>
                                  {
                                    d.vaccineType
                                  }
                                </strong>

                                <span>
                                  {new Date(
                                    d.dateAdministered
                                  ).toLocaleDateString()}
                                </span>
                              </li>
                            )
                          )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* -------------------------------- */}
            {/* Vaccine & Batch */}
            {/* -------------------------------- */}

            <div
              className="logdose-panel">
              <div className="logdose-panel-inner">

                <div className="logdose-panel-head">
                  <span className="logdose-panel-icon">
                    🧪
                  </span>

                  <div>
                    <h3>
                      Vaccine &amp;
                      Batch
                    </h3>

                    <p>
                      Available stock
                      filtered by the
                      citizen's age.
                    </p>
                  </div>
                </div>

                {loadingInventory ||
                loadingSchedules ? (
                  <p className="logdose-muted">
                    Loading clinic
                    stock and vaccine
                    schedule…
                  </p>
                ) : availableVaccines.length ===
                  0 ? (
                  <div>

                    <p className="logdose-muted">
                      {!selectedCitizen
                        ? "Select a citizen to show age-based vaccines."
                        : selectedAgeDays ===
                          null
                        ? "Select a citizen with a date of birth to show age-based vaccines."
                        : "No age-appropriate vaccine with available stock was found."}
                    </p>

                    {selectedAgeDays !==
                      null &&
                      selectedCitizen && (
                        <p className="logdose-muted">
                          Patient age:{" "}
                          <strong>
                            {ageLabel(
                              selectedAgeDays
                            )}
                          </strong>
                        </p>
                      )}
                  </div>
                ) : (
                  <>
                    {selectedAgeDays !==
                      null && (
                      <div className="logdose-age-banner">

                        <strong>
                          Recommended for
                          this age
                        </strong>

                        <span>
                          {ageLabel(
                            selectedAgeDays
                          )}
                        </span>
                      </div>
                    )}

                    {appointmentContext
                      ?.vaccineId?._id && (
                      <p className="logdose-muted">
                        Appointment vaccine
                        is preselected.
                        Select a stocked
                        batch below.
                      </p>
                    )}

                    <div className="logdose-chip-grid">

                      {availableVaccines.map(
                        (vaccine) => (
                          <button
                            type="button"
                            key={
                              vaccine.vaccineId
                            }
                            className={`logdose-tile ${
                              String(
                                vaccineId
                              ) ===
                              String(
                                vaccine.vaccineId
                              )
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              handleVaccineSelect(
                                vaccine.vaccineId
                              )
                            }
                          >
                            <span className="logdose-tile-icon">
                              💊
                            </span>

                            <strong>
                              {
                                vaccine.name
                              }
                            </strong>

                            {vaccine.code && (
                              <small>
                                {
                                  vaccine.code
                                }
                              </small>
                            )}
                          </button>
                        )
                      )}
                    </div>

                    {errors.vaccineType && (
                      <p className="logdose-error-text">
                        ⚠{" "}
                        {
                          errors.vaccineType
                        }
                      </p>
                    )}

                    {vaccineId && (
                      <div className="logdose-batches">

                        <p className="logdose-history-title">
                          Choose a batch
                          for{" "}
                          {selectedVaccine?.name ||
                            "this vaccine"}
                        </p>

                        <div className="logdose-batch-grid">

                          {availableBatches.map(
                            (b) => (
                              <button
                                type="button"
                                key={
                                  b._id
                                }
                                className={`logdose-batch-card ${
                                  batchNumber ===
                                  b.batchNumber
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleBatchSelect(
                                    b.batchNumber
                                  )
                                }
                              >
                                <strong>
                                  {
                                    b.batchNumber
                                  }
                                </strong>

                                <span>
                                  {
                                    b.quantity
                                  }{" "}
                                  left
                                </span>

                                <span className="logdose-batch-expiry">
                                  Exp{" "}
                                  {new Date(
                                    b.expiryDate
                                  ).toLocaleDateString()}
                                </span>
                              </button>
                            )
                          )}
                        </div>

                        {errors.batchNumber && (
                          <p className="logdose-error-text">
                            ⚠{" "}
                            {
                              errors.batchNumber
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* -------------------------------- */}
            {/* Date & Summary */}
            {/* -------------------------------- */}

            <div className="logdose-panel">
              <div className="logdose-panel-inner">

                <div className="logdose-panel-head">
                  <span className="logdose-panel-icon">
                    📅
                  </span>

                  <div>
                    <h3>
                      Date Administered
                    </h3>

                    <p>
                      Defaults to today.
                      Can't be a future
                      date.
                    </p>
                  </div>
                </div>

                <input
                  type="date"
                  className={`logdose-input ${
                    errors.dateAdministered
                      ? "has-error"
                      : ""
                  }`}
                  value={
                    dateAdministered
                  }
                  max={todayISO()}
                  onChange={
                    handleDateChange
                  }
                />

                {errors.dateAdministered && (
                  <p className="logdose-error-text">
                    ⚠{" "}
                    {
                      errors.dateAdministered
                    }
                  </p>
                )}

                <div className="logdose-review">

                  <p className="logdose-history-title">
                    Summary
                  </p>

                  <div className="logdose-review-row">
                    <span>
                      Citizen
                    </span>

                    <strong>
                      {selectedCitizen
                        ?.name ||
                        "—"}
                    </strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>
                      Age
                    </span>

                    <strong>
                      {selectedAgeDays !==
                      null
                        ? ageLabel(
                            selectedAgeDays
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>
                      Vaccine
                    </span>

                    <strong>
                      {
                        selectedVaccine
                          ?.name
                      ||
                        "—"}
                    </strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>
                      Batch
                    </span>

                    <strong>
                      {batchNumber ||
                        "—"}
                    </strong>
                  </div>

                  <div className="logdose-review-row">
                    <span>
                      Stock left
                    </span>

                    <strong>
                      {selectedBatchInfo
                        ? `${selectedBatchInfo.quantity}`
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="logdose-submit-bar">

            <button
              type="button"
              className="logdose-btn-secondary"
              onClick={
                resetForm
              }
              disabled={
                submitting
              }
            >
              Clear form
            </button>

            <button
              type="submit"
              className="logdose-btn-primary"
              disabled={
                submitting
              }
            >
              {submitting
                ? "Logging dose…"
                : "Log Dose"}
            </button>
          </div>
        </form>
      </main>

      {/* Success overlay */}
      {success && (
        <div
          className="logdose-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="logdose-success-card">

            <div className="logdose-stamp">
              ✓
            </div>

            <h2>
              Dose Logged
            </h2>

            <p>
              {success.message ||
                "The vaccination record was saved."}
            </p>

            <div className="logdose-success-details">

              <div>
                <span>
                  Citizen
                </span>

                <strong>
                  {
                    success.citizenName
                  }
                </strong>
              </div>

              <div>
                <span>
                  Vaccine
                </span>

                <strong>
                  {
                    success.vaccineType
                  }
                </strong>
              </div>

              <div>
                <span>
                  Batch
                </span>

                <strong>
                  {
                    success.batchNumber
                  }
                </strong>
              </div>

              <div>
                <span>
                  Date
                </span>

                <strong>
                  {new Date(
                    success.date
                  ).toLocaleDateString()}
                </strong>
              </div>
            </div>

            <div className="logdose-success-actions">

              <button
                className="logdose-btn-secondary"
                onClick={() => {
                  setSuccess(
                    null
                  );

                  resetForm();
                }}
              >
                Log another dose
              </button>

              <button
                className="logdose-btn-primary"
                onClick={() => {
                  setSuccess(
                    null
                  );

                  resetForm();

                  if (onBack) {
                    onBack();
                  }
                }}
              >
                Back to dashboard
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogDose;