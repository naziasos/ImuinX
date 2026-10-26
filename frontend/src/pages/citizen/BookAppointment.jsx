
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FeedbackPopup from "../../components/FeedbackPopup";
import ReadAloudControls from "../../components/ReadAloudControls";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import Icon from "../../components/Icons";

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

function BookAppointment({ onOpenFeedback, recoveryContext = null }) {
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
    if (!recoveryContext) return;

    const vaccineId =
      typeof recoveryContext.vaccineId === "object"
        ? recoveryContext.vaccineId?._id
        : recoveryContext.vaccineId;

    const profileId =
      typeof recoveryContext.profileId === "object"
        ? recoveryContext.profileId?._id
        : recoveryContext.profileId;

    setSelectedPerson(
      recoveryContext.profileType === "FamilyProfile"
        ? String(profileId || "")
        : "self"
    );

    setVaccine(String(vaccineId || ""));
    setDoseNumber(String(recoveryContext.doseNumber || ""));

    // The user must select a clinic, a date and an available slot.
    setClinic("");
    setDate("");
    setSelectedSlot("");
    setTimeSlots([]);
    setFormError("");
    setSuccessMessage("");
  }, [recoveryContext]);


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

  const recipientName =
    selectedPerson === "self"
      ? user?.name || "Myself"
      : familyMembers.find((member) => member._id === selectedPerson)?.name ||
        "Family member";

  const formIncomplete =
    booking || !clinic || !vaccine || !doseNumber || !date || !selectedSlot;

  const renderAppointmentCard = (appointment) => {
    const canCancel =
      appointment.status !== "Cancelled" &&
      appointment.status !== "Completed" &&
      new Date(appointment.dateTime) >= now;

    return (
      <article key={appointment._id} className="cz-item">
        <div className="cz-item__top">
          <div>
            <h3>{appointment.clinicId?.name || "Clinic"}</h3>
            <p>
              <Icon name="pin" size={14} />
              {appointment.clinicId?.location || "Location unavailable"}
            </p>
          </div>

          <StatusBadge status={appointment.status} />
        </div>

        <dl className="cz-facts">
          <div>
            <dt>For</dt>
            <dd>{appointment.familyProfileId?.name || user?.name || "Myself"}</dd>
          </div>
          <div>
            <dt>Vaccine</dt>
            <dd>{appointment.vaccineId?.name || "Details unavailable"}</dd>
          </div>
          <div>
            <dt>Dose</dt>
            <dd>
              {appointment.doseNumber ? `Dose ${appointment.doseNumber}` : "Not specified"}
            </dd>
          </div>
          <div>
            <dt>Date &amp; time</dt>
            <dd>{formatDateTime(appointment.dateTime)}</dd>
          </div>
        </dl>

        {canCancel && (
          <div className="cz-item__foot">
            <button
              type="button"
              className="cz-btn cz-btn--danger cz-btn--sm"
              onClick={() => handleCancelAppointment(appointment._id)}
            >
              Cancel appointment
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div id="read-aloud-booking">
      <ReadAloudControls guidance="Welcome to the vaccination booking page. To book an appointment, select the citizen who needs vaccination. Choose the required vaccine, select a clinic, and choose an available date and time. Review your selections carefully, then submit your booking request. Check your appointment status after submitting. Make sure all the details are correct before confirming your booking." />

      <PageHeader
        icon="calendar"
        eyebrow="Appointments"
        title="Vaccination Appointments"
        description="Book a vaccination appointment and manage your upcoming visits."
      />

      {pageError && (
        <div className="cz-alert cz-alert--error" role="alert">
          <Icon name="alert" size={20} />
          <span>{pageError}</span>
        </div>
      )}

      {recoveryContext && (
        <div className="cz-alert cz-alert--info" role="status">
          <Icon name="shield" size={20} />
          <span>
            You are booking a catch-up dose. We have pre-filled the vaccine and
            recipient for you.
          </span>
        </div>
      )}

      {/* Booking form on the left, appointment list on the right */}
      <div className="cz-grid-2">
        <section className="cz-card">
          <div className="cz-card__head">
            <div>
              <p className="cz-eyebrow">Appointment booking</p>
              <h2>Book a vaccination</h2>
              <p>Select the recipient, vaccine, clinic and available time.</p>
            </div>
          </div>

          {formError && (
            <div className="cz-alert cz-alert--error" role="alert">
              <Icon name="alert" size={20} />
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="cz-alert cz-alert--success" role="status">
              <Icon name="check" size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleConfirm}>
            <div className="cz-field">
              <label className="cz-label" htmlFor="appointment-person">
                Appointment for
              </label>
              <select
                id="appointment-person"
                className="cz-select"
                value={selectedPerson}
                onChange={(event) => setSelectedPerson(event.target.value)}
              >
                <option value="self">Myself ({user?.name || "Citizen"})</option>
                {familyMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.relationship || "Family member"})
                  </option>
                ))}
              </select>
            </div>

            <div className="cz-field">
              <label className="cz-label" htmlFor="appointment-vaccine">
                Vaccine
              </label>
              <select
                id="appointment-vaccine"
                className="cz-select"
                value={vaccine}
                onChange={(event) => {
                  setVaccine(event.target.value);
                  setDoseNumber("");
                  setFormError("");
                }}
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
                <p className="cz-hint cz-hint--warn">
                  No active vaccines loaded. Check the vaccine API response.
                </p>
              )}
            </div>

            <div className="cz-field">
              <label className="cz-label" htmlFor="appointment-dose">
                Dose number
              </label>
              <select
                id="appointment-dose"
                className="cz-select"
                value={doseNumber}
                onChange={(event) => setDoseNumber(event.target.value)}
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
                <p className="cz-hint cz-hint--warn">
                  No dose schedule found for this vaccine.
                </p>
              )}
            </div>

            <div className="cz-field">
              <label className="cz-label" htmlFor="appointment-clinic">
                Clinic
              </label>
              <select
                id="appointment-clinic"
                className="cz-select"
                value={clinic}
                onChange={(event) => {
                  setClinic(event.target.value);
                  setSelectedSlot("");
                  setTimeSlots([]);
                  setFormError("");
                }}
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

            <div className="cz-field">
              <label className="cz-label" htmlFor="appointment-date">
                Date
              </label>
              <input
                id="appointment-date"
                className="cz-input"
                type="date"
                value={date}
                min={getLocalDateString()}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSelectedSlot("");
                  setTimeSlots([]);
                  setFormError("");
                }}
                required
              />
            </div>

            <div className="cz-field">
              <span className="cz-label">Available time slots</span>

              {!clinic || !date ? (
                <p className="cz-hint">Select a clinic and date to see available times.</p>
              ) : slotLoading ? (
                <p className="cz-hint">Loading time slots…</p>
              ) : timeSlots.length === 0 ? (
                <p className="cz-hint">No available time slots for this date.</p>
              ) : (
                <div className="cz-slots">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      className={`cz-slot ${selectedSlot === slot.time ? "is-selected" : ""}`}
                      onClick={() => setSelectedSlot(slot.time)}
                      aria-pressed={selectedSlot === slot.time}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="cz-summary">
                <h4>Booking summary</h4>
                <dl>
                  <dt>Recipient</dt>
                  <dd>{recipientName}</dd>
                  <dt>Vaccine</dt>
                  <dd>{selectedVaccine?.name || "—"}</dd>
                  <dt>Dose</dt>
                  <dd>{doseNumber ? `Dose ${doseNumber}` : "—"}</dd>
                  <dt>Clinic</dt>
                  <dd>{selectedClinic?.name || "—"}</dd>
                  <dt>Date</dt>
                  <dd>{date}</dd>
                  <dt>Time</dt>
                  <dd>{selectedSlot}</dd>
                </dl>
              </div>
            )}

            <button
              type="submit"
              className="cz-btn cz-btn--primary cz-btn--block"
              disabled={formIncomplete}
            >
              {booking ? "Booking…" : "Confirm appointment"}
            </button>
          </form>
        </section>

        {/* Appointment list on the right */}
        <section className="cz-card cz-card--soft">
          <div className="cz-card__head">
            <div>
              <p className="cz-eyebrow">My appointments</p>
              <h2>Appointment status</h2>
            </div>
            <span className="cz-badge cz-badge--blue">{myAppointments.length} total</span>
          </div>

          {appointmentLoading ? (
            <div className="cz-loading">
              <div className="cz-spinner" />
              <p>Loading appointments…</p>
            </div>
          ) : myAppointments.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No appointments yet"
              text="Your booked appointments will appear here."
            />
          ) : (
            <>
              <h3 className="cz-subtitle">Upcoming</h3>
              <div className="cz-stack" style={{ gap: 12 }}>
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map(renderAppointmentCard)
                ) : (
                  <p className="cz-hint">No upcoming appointments.</p>
                )}
              </div>

              <h3 className="cz-subtitle" style={{ marginTop: 26 }}>
                Past and cancelled
              </h3>
              <div className="cz-stack" style={{ gap: 12 }}>
                {pastAppointments.length > 0 ? (
                  pastAppointments.map(renderAppointmentCard)
                ) : (
                  <p className="cz-hint">No past appointments.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

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