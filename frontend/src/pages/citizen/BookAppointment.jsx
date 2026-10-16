
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FeedbackPopup from "../../components/FeedbackPopup";
import "../clinicAdmin/ClinicAdminDashboard.css";

const API = "http://localhost:5000/api";

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function BookAppointment({ onBack, onOpenFeedback }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const citizenId = user?.id || user?._id;
  const token = localStorage.getItem("token");

  // Booking form
  const [selectedPerson, setSelectedPerson] = useState("self");
  const [clinic, setClinic] = useState("");
  const [vaccine, setVaccine] = useState("");
  const [doseNumber, setDoseNumber] = useState("");
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Data
  const [clinics, setClinics] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);

  // Loading and feedback
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Bumped after a booking that earned a feedback prompt
  const [feedbackKey, setFeedbackKey] = useState(0);

  const authHeaders = useMemo(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // Fetch JSON and report HTTP errors consistently.
  const fetchJson = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      return data;
    },
    [authHeaders]
  );

  // Fetch clinics, vaccines, schedules and family profiles.
  useEffect(() => {
    let cancelled = false;

    async function loadBookingData() {
      setPageError("");

      try {
        const requests = [
          fetchJson(`${API}/clinics`),
          fetchJson(`${API}/vaccines`),
          fetchJson(`${API}/vaccine-schedules`),
          fetchJson(`${API}/family`),
        ];

        const results = await Promise.allSettled(requests);

        if (cancelled) return;

        const [clinicResult, vaccineResult, scheduleResult, familyResult] =
          results;

        if (clinicResult.status === "fulfilled") {
          const data = clinicResult.value;
          setClinics(Array.isArray(data.clinics) ? data.clinics : []);
        } else {
          setPageError(
            `Could not load clinics: ${clinicResult.reason.message}`
          );
        }

        if (vaccineResult.status === "fulfilled") {
          const data = vaccineResult.value;
          const list = Array.isArray(data)
            ? data
            : data.vaccines || data.data || [];

          setVaccines(list.filter((item) => item.isActive !== false));
        } else {
          setPageError((previous) =>
            [
              previous,
              `Could not load vaccines: ${vaccineResult.reason.message}`,
            ]
              .filter(Boolean)
              .join(" ")
          );
        }

        if (scheduleResult.status === "fulfilled") {
          const data = scheduleResult.value;
          const list = Array.isArray(data)
            ? data
            : data.schedules || data.vaccineSchedules || data.data || [];

          setSchedules(list);
        } else {
          setPageError((previous) =>
            [
              previous,
              `Could not load vaccine schedules: ${scheduleResult.reason.message}`,
            ]
              .filter(Boolean)
              .join(" ")
          );
        }

        if (familyResult.status === "fulfilled") {
          const data = familyResult.value;
          setFamilyMembers(
            Array.isArray(data.familyMembers)
              ? data.familyMembers
              : Array.isArray(data.familyProfiles)
              ? data.familyProfiles
              : []
          );
        } else {
          setPageError((previous) =>
            [
              previous,
              `Could not load family profiles: ${familyResult.reason.message}`,
            ]
              .filter(Boolean)
              .join(" ")
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(error.message || "Could not load booking information.");
        }
      }
    }

    loadBookingData();

    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  // Fetch appointments for the logged-in account.
  const loadAppointments = useCallback(async () => {
    if (!citizenId || !token) {
      setAppointmentLoading(false);
      return;
    }

    setAppointmentLoading(true);

    try {
      const data = await fetchJson(
        `${API}/appointments/citizen/${citizenId}`
      );
      setMyAppointments(data.appointments || []);
    } catch (error) {
      setPageError(error.message || "Could not load appointments.");
    } finally {
      setAppointmentLoading(false);
    }
  }, [citizenId, token, fetchJson]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Get the dose numbers belonging to the selected vaccine.
  const availableDoses = useMemo(() => {
    if (!vaccine) return [];

    const matchingSchedules = schedules.filter((schedule) => {
      const scheduleVaccineId =
        schedule.vaccineId?._id || schedule.vaccineId;
      return String(scheduleVaccineId) === String(vaccine);
    });

    const doseMap = new Map();

    matchingSchedules.forEach((schedule) => {
      (schedule.doses || []).forEach((dose) => {
        const number = Number(dose.doseNumber);

        if (Number.isInteger(number) && number >= 1) {
          doseMap.set(number, number);
        }
      });
    });

    return [...doseMap.values()].sort((a, b) => a - b);
  }, [vaccine, schedules]);

  // Fetch available clinic slots for the selected date.
  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      if (!clinic || !date) {
        setTimeSlots([]);
        return;
      }

      setSlotLoading(true);
      setTimeSlots([]);
      setSelectedSlot("");

      try {
        const query = new URLSearchParams({ clinicId: clinic, date });
        const data = await fetchJson(
          `${API}/appointments/slots?${query.toString()}`
        );

        if (!cancelled) {
          setTimeSlots(
            (data.availableSlots || []).map((time) => ({
              time,
              available: true,
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(error.message || "Could not load available time slots.");
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [clinic, date, fetchJson]);

  const resetForm = () => {
    setSelectedPerson("self");
    setClinic("");
    setVaccine("");
    setDoseNumber("");
    setDate("");
    setSelectedSlot("");
    setTimeSlots([]);
  };

  // Create an appointment.
  const handleConfirm = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!citizenId || !token) {
      setFormError("Please log in again before booking an appointment.");
      return;
    }

    if (
      !clinic ||
      !vaccine ||
      !doseNumber ||
      !date ||
      !selectedSlot
    ) {
      setFormError("Please complete all fields and select a time slot.");
      return;
    }

    if (date < getLocalDateString()) {
      setFormError("Please select today or a future date.");
      return;
    }

    setBooking(true);

    try {
      const data = await fetchJson(`${API}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyProfileId: selectedPerson === "self" ? null : selectedPerson,
          clinicId: clinic,
          vaccineId: vaccine,
          doseNumber: Number(doseNumber),
          date,
          time: selectedSlot,
        }),
      });

      const selectedClinic = clinics.find(
        (item) => String(item._id) === String(clinic)
      );
      const selectedVaccine = vaccines.find(
        (item) => String(item._id) === String(vaccine)
      );

      setSuccessMessage(
        `Appointment booked successfully at ${selectedClinic?.name || "the selected clinic"} for ${selectedVaccine?.name || "the selected vaccine"}, dose ${doseNumber}, on ${date} at ${selectedSlot}.`
      );

      // Show the feedback popup right away (the server only returns a
      // prompt when the cooldown allows one)
      if (data?.feedback) {
        setFeedbackKey((key) => key + 1);
      }

      resetForm();
      await loadAppointments();
    } catch (error) {
      setFormError(error.message || "Failed to book the appointment.");
    } finally {
      setBooking(false);
    }
  };

  // Cancel an appointment.
  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    setPageError("");

    try {
      await fetchJson(`${API}/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
      });

      setMyAppointments((previous) =>
        previous.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status: "Cancelled" }
            : appointment
        )
      );
    } catch (error) {
      setPageError(error.message || "Failed to cancel the appointment.");
    }
  };

  const now = new Date();

  const upcomingAppointments = myAppointments.filter(
    (appointment) =>
      new Date(appointment.dateTime) >= now &&
      !["Cancelled", "Completed"].includes(appointment.status)
  );

  const pastAppointments = myAppointments.filter(
    (appointment) =>
      new Date(appointment.dateTime) < now ||
      ["Cancelled", "Completed"].includes(appointment.status)
  );

  const selectedClinic = clinics.find(
    (item) => String(item._id) === String(clinic)
  );
  const selectedVaccine = vaccines.find(
    (item) => String(item._id) === String(vaccine)
  );

  const inputStyle = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#fff",
    color: "#334155",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontWeight: 600,
    color: "#334155",
  };

  const renderAppointmentCard = (appointment) => (
    <article
      key={appointment._id}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 5px", color: "#1e293b" }}>
            {appointment.clinicId?.name || "Clinic"}
          </h3>
          <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "14px" }}>
            {appointment.clinicId?.location || "Location unavailable"}
          </p>
        </div>

        <span
          style={{
            flexShrink: 0,
            borderRadius: "20px",
            padding: "5px 9px",
            fontSize: "12px",
            fontWeight: 700,
            background:
              appointment.status === "Confirmed"
                ? "#dcfce7"
                : appointment.status === "Cancelled"
                ? "#fee2e2"
                : appointment.status === "Completed"
                ? "#dbeafe"
                : "#fef3c7",
            color:
              appointment.status === "Confirmed"
                ? "#166534"
                : appointment.status === "Cancelled"
                ? "#b91c1c"
                : appointment.status === "Completed"
                ? "#1d4ed8"
                : "#92400e",
          }}
        >
          {appointment.status}
        </span>
      </div>

      <div style={{ color: "#475569", fontSize: "14px", lineHeight: 1.8 }}>
        <p style={{ margin: 0 }}>
          <strong>For:</strong>{" "}
          {appointment.familyProfileId?.name || user?.name || "Myself"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Vaccine:</strong>{" "}
          {appointment.vaccineId?.name || "Vaccine details unavailable"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Dose:</strong>{" "}
          {appointment.doseNumber ? `Dose ${appointment.doseNumber}` : "Not specified"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Date & time:</strong> {formatDateTime(appointment.dateTime)}
        </p>
      </div>

      {appointment.status !== "Cancelled" &&
        appointment.status !== "Completed" &&
        new Date(appointment.dateTime) >= now && (
          <button
            type="button"
            onClick={() => handleCancelAppointment(appointment._id)}
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              border: "none",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel appointment
          </button>
        )}
    </article>
  );

  return (
    <div
      className="clinic-dashboard"
      style={{ display: "block", padding: "20px", minHeight: "100vh" }}
    >
      <main className="clinic-main" style={{ marginLeft: 0, width: "100%" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginBottom: "18px",
            padding: "10px 15px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#f1f5f9",
            color: "#334155",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </button>

        <header className="clinic-header">
          <div>
            <p className="clinic-breadcrumb">Dashboard / Appointments</p>
            <h1>Vaccination Appointments</h1>
            <p className="clinic-description">
              Book a vaccination appointment and manage your upcoming visits.
            </p>
          </div>

          <div className="clinic-profile">
            <div className="clinic-profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "C"}
            </div>
            <div>
              <strong>{user?.name || "Citizen"}</strong>
              <span>Citizen</span>
            </div>
          </div>
        </header>

        {pageError && (
          <div
            role="alert"
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "9px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {pageError}
          </div>
        )}

        {/* Booking form on the left, appointment list on the right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            alignItems: "start",
            gap: "22px",
          }}
        >
          <section
            style={{
              minWidth: 0,
              padding: "22px",
              borderRadius: "14px",
              background: "#fff",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e2e8f0",
            }}
          >
            <p className="section-label">APPOINTMENT BOOKING</p>
            <h2 style={{ marginTop: 0 }}>Book a vaccination</h2>
            <p style={{ color: "#64748b", marginBottom: "22px" }}>
              Select the recipient, vaccine, clinic and available time.
            </p>

            {formError && (
              <div
                role="alert"
                style={{
                  marginBottom: "16px",
                  padding: "11px",
                  borderRadius: "8px",
                  background: "#fee2e2",
                  color: "#991b1b",
                }}
              >
                {formError}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                style={{
                  marginBottom: "16px",
                  padding: "11px",
                  borderRadius: "8px",
                  background: "#dcfce7",
                  color: "#166534",
                }}
              >
                {successMessage}
              </div>
            )}

            <form onSubmit={handleConfirm}>
              <div style={{ marginBottom: "17px" }}>
                <label style={labelStyle} htmlFor="appointment-person">
                  Appointment for
                </label>
                <select
                  id="appointment-person"
                  value={selectedPerson}
                  onChange={(event) => setSelectedPerson(event.target.value)}
                  style={inputStyle}
                >
                  <option value="self">Myself ({user?.name || "Citizen"})</option>
                  {familyMembers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.relationship || "Family member"})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "17px" }}>
                <label style={labelStyle} htmlFor="appointment-vaccine">
                  Vaccine
                </label>
                <select
                  id="appointment-vaccine"
                  value={vaccine}
                  onChange={(event) => {
                    setVaccine(event.target.value);
                    setDoseNumber("");
                    setFormError("");
                  }}
                  style={inputStyle}
                  required
                >
                  <option value="">Select a vaccine</option>
                  {vaccines.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
                {vaccines.length === 0 && (
                  <p style={{ color: "#b45309", fontSize: "13px" }}>
                    No active vaccines loaded. Check the vaccine API response.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: "17px" }}>
                <label style={labelStyle} htmlFor="appointment-dose">
                  Dose number
                </label>
                <select
                  id="appointment-dose"
                  value={doseNumber}
                  onChange={(event) => setDoseNumber(event.target.value)}
                  style={inputStyle}
                  disabled={!vaccine || availableDoses.length === 0}
                  required
                >
                  <option value="">Select a dose</option>
                  {availableDoses.map((dose) => (
                    <option key={dose} value={dose}>
                      Dose {dose}
                    </option>
                  ))}
                </select>
                {vaccine && availableDoses.length === 0 && (
                  <p style={{ color: "#b45309", fontSize: "13px" }}>
                    No dose schedule found for this vaccine.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: "17px" }}>
                <label style={labelStyle} htmlFor="appointment-clinic">
                  Clinic
                </label>
                <select
                  id="appointment-clinic"
                  value={clinic}
                  onChange={(event) => {
                    setClinic(event.target.value);
                    setSelectedSlot("");
                    setTimeSlots([]);
                    setFormError("");
                  }}
                  style={inputStyle}
                  required
                >
                  <option value="">Select a clinic</option>
                  {clinics.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} {item.location ? `- ${item.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "17px" }}>
                <label style={labelStyle} htmlFor="appointment-date">
                  Date
                </label>
                <input
                  id="appointment-date"
                  type="date"
                  value={date}
                  min={getLocalDateString()}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSelectedSlot("");
                    setTimeSlots([]);
                    setFormError("");
                  }}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Available time slots</label>

                {!clinic || !date ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    Select a clinic and date to see available times.
                  </p>
                ) : slotLoading ? (
                  <p style={{ color: "#64748b" }}>Loading time slots...</p>
                ) : timeSlots.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    No available time slots for this date.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {timeSlots.map((slot) => {
                      const selected = selectedSlot === slot.time;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedSlot(slot.time)}
                          style={{
                            padding: "10px 6px",
                            border: selected
                              ? "1px solid #2563eb"
                              : "1px solid #cbd5e1",
                            borderRadius: "8px",
                            background: selected ? "#2563eb" : "#fff",
                            color: selected ? "#fff" : "#334155",
                            cursor: "pointer",
                            fontWeight: selected ? 700 : 500,
                          }}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div
                  style={{
                    marginBottom: "18px",
                    padding: "13px",
                    borderRadius: "9px",
                    background: "#eff6ff",
                    color: "#1e40af",
                    fontSize: "14px",
                    lineHeight: 1.8,
                  }}
                >
                  <strong>Booking summary</strong>
                  <div>Recipient: {selectedPerson === "self"
                    ? user?.name || "Myself"
                    : familyMembers.find(
                        (member) => member._id === selectedPerson
                      )?.name || "Family member"}</div>
                  <div>Vaccine: {selectedVaccine?.name || "—"}</div>
                  <div>Dose: {doseNumber ? `Dose ${doseNumber}` : "—"}</div>
                  <div>Clinic: {selectedClinic?.name || "—"}</div>
                  <div>Date: {date}</div>
                  <div>Time: {selectedSlot}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  booking ||
                  !clinic ||
                  !vaccine ||
                  !doseNumber ||
                  !date ||
                  !selectedSlot
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "none",
                  borderRadius: "9px",
                  background:
                    booking ||
                    !clinic ||
                    !vaccine ||
                    !doseNumber ||
                    !date ||
                    !selectedSlot
                      ? "#cbd5e1"
                      : "#2563eb",
                  color: "#fff",
                  fontWeight: 700,
                  cursor:
                    booking ||
                    !clinic ||
                    !vaccine ||
                    !doseNumber ||
                    !date ||
                    !selectedSlot
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {booking ? "Booking..." : "Confirm appointment"}
              </button>
            </form>
          </section>

          {/* Appointment list on the right */}
          <section
            style={{
              minWidth: 0,
              padding: "22px",
              borderRadius: "14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div>
                <p className="section-label">MY APPOINTMENTS</p>
                <h2 style={{ margin: 0 }}>Appointment status</h2>
              </div>
              <span className="worker-count">
                {myAppointments.length} total
              </span>
            </div>

            {appointmentLoading ? (
              <div className="empty-workers">
                <p>Loading appointments...</p>
              </div>
            ) : myAppointments.length === 0 ? (
              <div className="empty-workers">
                <div className="empty-icon">📅</div>
                <h3>No appointments yet</h3>
                <p>Your booked appointments will appear here.</p>
              </div>
            ) : (
              <>
                <h3 style={{ color: "#334155", margin: "0 0 12px" }}>
                  Upcoming
                </h3>

                <div style={{ display: "grid", gap: "12px" }}>
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map(renderAppointmentCard)
                  ) : (
                    <p style={{ color: "#64748b" }}>
                      No upcoming appointments.
                    </p>
                  )}
                </div>

                <h3 style={{ color: "#334155", margin: "26px 0 12px" }}>
                  Past and cancelled
                </h3>

                <div style={{ display: "grid", gap: "12px" }}>
                  {pastAppointments.length > 0 ? (
                    pastAppointments.map(renderAppointmentCard)
                  ) : (
                    <p style={{ color: "#64748b" }}>
                      No past appointments.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Asks about the booking experience (only when the server created a prompt) */}
      <FeedbackPopup
        type="Appointment"
        delay={0}
        enabled={feedbackKey > 0}
        refreshKey={feedbackKey}
        onOpenFeedback={onOpenFeedback}
      />
    </div>
  );
}

export default BookAppointment;
