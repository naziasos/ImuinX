
import React, { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../../services/api";
import "./MissedDoses.css";

const REASONS = [
  { value: "travel", label: "Travel" },
  { value: "sick", label: "Illness" },
  { value: "stock_unavailable", label: "Vaccine unavailable" },
  { value: "appointment_issue", label: "Appointment issue" },
  { value: "forgot", label: "Forgot the dose" },
  { value: "access_issue", label: "Access or transport issue" },
  { value: "other", label: "Other" },
];

const CLOSED_STATUSES = ["Completed", "Cancelled", "Superseded"];

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getVaccineName(item) {
  if (item.vaccineId && typeof item.vaccineId === "object") {
    return item.vaccineId.name || item.vaccineId.code || "Vaccine";
  }
  return "Vaccine";
}

function getReasonLabel(reasonCode) {
  if (!reasonCode || reasonCode === "not_provided") {
    return "Not provided";
  }

  return (
    REASONS.find((reason) => reason.value === reasonCode)?.label ||
    reasonCode
  );
}

function getProfileName(item, currentUser) {
  if (item.profileType === "FamilyProfile") {
    return typeof item.profileId === "object"
      ? item.profileId.name || "Family member"
      : "Family member";
  }

  return currentUser?.name || "Myself";
}

function MissedDoses({ onBookAppointment }) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [selectedRecovery, setSelectedRecovery] = useState(null);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [savingReason, setSavingReason] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await api.get("/recovery");
      const records = Array.isArray(response.data.schedules)
        ? response.data.schedules
        : [];

      setSchedules(
        records.filter((item) => !CLOSED_STATUSES.includes(item.status))
      );
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const openReasonForm = (item) => {
    setSelectedRecovery(item);
    setReasonCode(
      item.reasonCode && item.reasonCode !== "not_provided"
        ? item.reasonCode
        : ""
    );
    setReasonDetails(item.reasonDetails || "");
    setActionError("");
    setActionMessage("");
  };

  const closeReasonForm = () => {
    if (savingReason) return;

    setSelectedRecovery(null);
    setActionError("");
    setActionMessage("");
  };

  const handleSaveReason = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionMessage("");

    if (!selectedRecovery) return;

    if (!reasonCode) {
      setActionError("Please select a reason.");
      return;
    }

    if (reasonCode === "other" && !reasonDetails.trim()) {
      setActionError("Please describe the reason.");
      return;
    }

    if (reasonDetails.trim().length > 500) {
      setActionError("Details must be 500 characters or fewer.");
      return;
    }

    setSavingReason(true);

    try {
      await api.patch(
        `/recovery/${selectedRecovery._id}/reason`,
        {
          reasonCode,
          reasonDetails: reasonDetails.trim(),
        }
      );

      // The backend generates a date only when its approved medical
      // rule and verified dose history are sufficient.
      const scheduleResponse = await api.post(
        `/recovery/${selectedRecovery._id}/generate-schedule`,
        {}
      );

      await loadSchedules();

      if (scheduleResponse.data.status === "ReviewRequired") {
        setActionMessage(
          scheduleResponse.data.message ||
            "Clinical review is required before suggesting a date."
        );
      } else {
        setActionMessage("Reason saved and catch-up schedule updated.");
      }

      setSelectedRecovery(null);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSavingReason(false);
    }
  };

  const activeSchedules = schedules.filter(
    (item) => !CLOSED_STATUSES.includes(item.status)
  );

  const selfSchedules = activeSchedules.filter(
    (item) => item.profileType === "User"
  );

  const familyGroups = activeSchedules
    .filter((item) => item.profileType === "FamilyProfile")
    .reduce((groups, item) => {
      const profileId =
        typeof item.profileId === "object"
          ? item.profileId?._id
          : item.profileId;

      const key = String(profileId || "unknown");

      if (!groups[key]) {
        groups[key] = {
          id: key,
          name: getProfileName(item, currentUser),
          schedules: [],
        };
      }

      groups[key].schedules.push(item);
      return groups;
    }, {});

  const renderScheduleCard = (item) => {
    const isBooked = item.status === "AppointmentBooked";
    const needsReview = item.status === "ReviewRequired";

    return (
      <article className="missed-dose-card" key={item._id}>
        <div className="missed-dose-card-top">
          <div>
            <h4>{getVaccineName(item)}</h4>
            <p className="missed-dose-number">
              Dose {item.doseNumber}
            </p>
          </div>

          <span
            className={`missed-dose-status ${
              needsReview
                ? "status-review"
                : isBooked
                ? "status-booked"
                : "status-missed"
            }`}
          >
            {item.status || "Missed"}
          </span>
        </div>

        <div className="missed-dose-details">
          <div>
            <span>Original due date</span>
            <strong>{formatDate(item.originalDueDate)}</strong>
          </div>

          <div>
            <span>Recovery reason</span>
            <strong>{getReasonLabel(item.reasonCode)}</strong>
          </div>

          {item.reasonDetails && (
            <div className="missed-dose-full-row">
              <span>Reason details</span>
              <strong>{item.reasonDetails}</strong>
            </div>
          )}

          <div>
            <span>Suggested date</span>
            <strong>
              {formatDate(item.suggestedDueDate)}
            </strong>
          </div>
        </div>

        {needsReview && (
          <p className="missed-dose-review-note">
            A verified medical rule or dose history is missing.
            Please wait for clinical review before booking.
          </p>
        )}

        <div className="missed-dose-actions">
          <button
            type="button"
            className="missed-dose-secondary"
            onClick={() => openReasonForm(item)}
            disabled={isBooked}
          >
            {item.reasonCode && item.reasonCode !== "not_provided"
              ? "Update Reason"
              : "Provide Reason"}
          </button>

            <button
            type="button"
            className="missed-dose-primary"
            onClick={() => onBookAppointment?.(item)}
            disabled={
                isBooked ||
                needsReview ||
                !item.suggestedDueDate
            }
            >
            {isBooked
                ? "Appointment Booked"
                : needsReview
                ? "Review Required"
                : !item.suggestedDueDate
                ? "Provide Reason First"
                : "Book Appointment"}
            </button>

        </div>
      </article>
    );
  };

  return (
    <section className="missed-doses-section">
      <div className="missed-doses-heading">
        <div>
          <p className="missed-doses-eyebrow">VACCINATION RECOVERY</p>
          <h2>Missed Doses &amp; Catch-up Schedule</h2>
          <p>
            Review missed doses, provide a reason and check your
            approved catch-up schedule.
          </p>
        </div>

        <button
          type="button"
          className="missed-dose-refresh"
          onClick={loadSchedules}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {pageError && (
        <div className="missed-dose-error" role="alert">
          {pageError}
          <button type="button" onClick={loadSchedules}>
            Try again
          </button>
        </div>
      )}

      {actionMessage && (
        <div className="missed-dose-success" role="status">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="missed-dose-empty">
          Loading missed-dose records...
        </div>
      ) : !pageError && activeSchedules.length === 0 ? (
        <div className="missed-dose-empty">
          <div className="missed-dose-empty-icon">✓</div>
          <h3>No missed doses</h3>
          <p>
            You and your family currently have no active missed-dose
            recovery records.
          </p>
        </div>
      ) : (
        <>
          {selfSchedules.length > 0 && (
            <div className="missed-dose-group">
              <h3>My missed doses</h3>
              <div className="missed-dose-grid">
                {selfSchedules.map(renderScheduleCard)}
              </div>
            </div>
          )}

          {Object.values(familyGroups).map((group) => (
            <div className="missed-dose-group" key={group.id}>
              <h3>{group.name}'s missed doses</h3>
              <div className="missed-dose-grid">
                {group.schedules.map(renderScheduleCard)}
              </div>
            </div>
          ))}
        </>
      )}

      {selectedRecovery && (
        <div
          className="missed-dose-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReasonForm();
          }}
        >
          <div
            className="missed-dose-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="missed-dose-reason-title"
          >
            <div className="missed-dose-modal-header">
              <div>
                <h3 id="missed-dose-reason-title">
                  Provide Missed-dose Reason
                </h3>
                <p>
                  {getProfileName(selectedRecovery, currentUser)} ·{" "}
                  {getVaccineName(selectedRecovery)} · Dose{" "}
                  {selectedRecovery.doseNumber}
                </p>
              </div>

              <button
                type="button"
                className="missed-dose-close"
                onClick={closeReasonForm}
                disabled={savingReason}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveReason}>
              <label htmlFor="recovery-reason">
                Reason <span>*</span>
              </label>

              <select
                id="recovery-reason"
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value)}
                required
              >
                <option value="">Select a reason</option>
                {REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>

              <label htmlFor="recovery-reason-details">
                Additional details
                {reasonCode === "other" ? " (required)" : " (optional)"}
              </label>

              <textarea
                id="recovery-reason-details"
                value={reasonDetails}
                onChange={(event) => setReasonDetails(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Briefly explain the reason..."
                required={reasonCode === "other"}
              />

              <p className="missed-dose-character-count">
                {reasonDetails.length}/500 characters
              </p>

              {actionError && (
                <div className="missed-dose-error" role="alert">
                  {actionError}
                </div>
              )}

              <div className="missed-dose-modal-actions">
                <button
                  type="button"
                  className="missed-dose-secondary"
                  onClick={closeReasonForm}
                  disabled={savingReason}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="missed-dose-primary"
                  disabled={savingReason}
                >
                  {savingReason ? "Saving..." : "Save Reason"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MissedDoses;
