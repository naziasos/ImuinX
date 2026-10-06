import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../../services/api";
import "../citizen/Feedback.css";
import "./ClinicFeedback.css";
import "./ClinicAdminDashboard.css";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Stars({ value }) {
  const rating = Number(value) || 0;

  return (
    <span
      className="fb-stars-static"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((number) => (
        <span
          key={number}
          className={number <= rating ? "on" : ""}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function ClinicFeedback({
  onBack,
  onWorkers,
  onAppointments,
  onDailyDuties,
  onVaccinations,
  onInventory,
  onFeedback,
}) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [feedbackResponse, summaryResponse] =
        await Promise.all([
          api.get("/clinic-feedback"),
          api.get("/clinic-feedback/summary"),
        ]);

      setItems(feedbackResponse.data.feedback || []);
      setSummary(summaryResponse.data.summary || null);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRowMsg = (id, message) => {
    setRowError((previous) => ({
      ...previous,
      [id]: message,
    }));
  };

  const sendReply = async (feedbackId) => {
    const message = (drafts[feedbackId] || "").trim();

    if (!message) {
      setRowMsg(
        feedbackId,
        "Please write a reply first."
      );
      return;
    }

    try {
      setBusyId(feedbackId);
      setRowMsg(feedbackId, "");

      await api.put(
        `/clinic-feedback/${feedbackId}/respond`,
        {
          message,
        }
      );

      setDrafts((previous) => ({
        ...previous,
        [feedbackId]: "",
      }));

      await load();
    } catch (err) {
      console.error(err);
      setRowMsg(
        feedbackId,
        errorMessage(err)
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
  };

  return (
    <div className="clinic-dashboard">

      <aside className="clinic-sidebar">

        <div>

          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
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
              onClick={onWorkers}
            >
              <span>👥</span>
              Workers
            </button>

            <button
              className="clinic-nav-item"
              onClick={onAppointments}
            >
              <span>📅</span>
              Appointments
            </button>

            <button
              className="clinic-nav-item"
              onClick={onDailyDuties}
            >
              <span>📝</span>
              Daily Duties
            </button>

            <button
              className="clinic-nav-item"
              onClick={onVaccinations}
            >
              <span>💉</span>
              Vaccinations
            </button>

            <button
              className="clinic-nav-item"
              onClick={onInventory}
            >
              <span>📦</span>
              Inventory
            </button>

            <button
              className="clinic-nav-item active"
              onClick={onFeedback}
            >
              <span>💬</span>
              Feedback
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
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>

      <main className="clinic-main">

        <header className="clinic-header">

          <div>
            <p className="clinic-breadcrumb">
              Feedback
            </p>

            <h1>
              Patient Feedback
            </h1>

            <p className="clinic-description">
              See what patients say about your clinic and
              reply to them.
            </p>
          </div>

          <div className="clinic-profile">

            <div className="clinic-profile-avatar">
              C
            </div>

            <div>
              <strong>Clinic Admin</strong>
              <span>Administrator</span>
            </div>

          </div>

        </header>

        {!loading && error && (
          <div className="clinic-error">

            {error}

            <br />

            <button
              className="fb-btn primary"
              onClick={load}
              style={{ marginTop: "10px" }}
            >
              Try again
            </button>

          </div>
        )}

        {!error && summary && (
          <section className="cf-summary">

            <div className="cf-score">

              <strong>
                {summary.total
                  ? Number(
                      summary.averageRating
                    ).toFixed(1)
                  : "—"}
              </strong>

              <Stars
                value={Math.round(
                  Number(
                    summary.averageRating
                  ) || 0
                )}
              />

              <small>
                {summary.total} review
                {summary.total === 1
                  ? ""
                  : "s"}
              </small>

            </div>

          </section>
        )}

        {loading && (
          <div className="fb-state">

            <div className="fb-spinner" />

            <p>
              Loading feedback…
            </p>

          </div>
        )}

        {!loading &&
          !error &&
          items.length === 0 && (
            <div className="fb-state">

              <div className="fb-state-icon">
                📭
              </div>

              <h2>
                No feedback found
              </h2>

              <p>
                Feedback appears here once patients submit
                it after a vaccination.
              </p>

            </div>
          )}

        {!loading &&
          !error &&
          items.length > 0 && (

            <div className="cf-list">

              {items.map((item) => {

                const author =
                  item.isAnonymous
                    ? "Anonymous"
                    : item.userId?.name ||
                      item.citizenId?.name ||
                      "Patient";

                const rating =
                  Number(item.rating) || 0;

                const busy =
                  busyId === item._id;

                return (
                  <article
                    key={item._id}
                    className={`fb-card ${
                      rating <= 2
                        ? "cf-low-rating"
                        : ""
                    }`}
                  >

                    <div className="fb-card-head">

                      <div>
                        <strong>
                          {author}
                        </strong>

                        <small>
                          {item.vaccineType} ·{" "}
                          {formatDate(
                            item.submittedAt
                          )}
                        </small>
                      </div>

                      <span
                        className={`fb-status ${
                          item.reviewStatus
                            ?.toLowerCase() || ""
                        }`}
                      >
                        {item.reviewStatus ||
                          "Submitted"}
                      </span>

                    </div>

                    <div className="cf-rating">
                      <Stars value={rating} />
                    </div>

                    {rating <= 2 && (
                      <div className="cf-low-rating-text">
                        ⚠️ Low rating — attention may
                        be needed
                      </div>
                    )}

                    {item.tags?.length > 0 && (
                      <div className="fb-tagrow">

                        {item.tags.map((tag) => (
                          <span key={tag}>
                            {tag}
                          </span>
                        ))}

                      </div>
                    )}

                    {item.comment ? (
                      <p className="fb-comment">
                        {item.comment}
                      </p>
                    ) : (
                      <p className="fb-comment cf-muted">
                        No written comment.
                      </p>
                    )}

                    {item.responses?.length > 0 && (
                      <div className="fb-replies">

                        {item.responses.map(
                          (reply) => (
                            <div
                              className="fb-reply"
                              key={reply._id}
                            >

                              <div className="fb-reply-head">

                                <strong>
                                  {reply.responderId
                                    ?.name ||
                                    reply.responderRole ||
                                    "Clinic Staff"}
                                </strong>

                                <small>
                                  {formatDate(
                                    reply.createdAt
                                  )}
                                </small>

                              </div>

                              <p>
                                {reply.message}
                              </p>

                            </div>
                          )
                        )}

                      </div>
                    )}

                    <div className="cf-reply-box">

                      <label>
                        Reply to this feedback
                      </label>

                      <textarea
                        rows={3}
                        maxLength={1000}
                        placeholder="Write a reply to the patient..."
                        value={
                          drafts[item._id] || ""
                        }
                        onChange={(event) => {

                          setDrafts(
                            (previous) => ({
                              ...previous,
                              [item._id]:
                                event.target.value,
                            })
                          );

                          if (
                            rowError[item._id]
                          ) {
                            setRowMsg(
                              item._id,
                              ""
                            );
                          }
                        }}
                      />

                      <div className="cf-reply-bottom">

                        <span className="cf-character-count">
                          {(drafts[item._id] || "")
                            .length}
                          /1000
                        </span>

                        <button
                          type="button"
                          className="fb-btn primary"
                          disabled={busy}
                          onClick={() =>
                            sendReply(item._id)
                          }
                        >
                          {busy
                            ? "Sending..."
                            : "Send Reply"}
                        </button>

                      </div>

                      {rowError[item._id] && (
                        <div
                          className="fb-alert"
                          role="alert"
                        >
                          {rowError[item._id]}
                        </div>
                      )}

                    </div>

                  </article>
                );
              })}

            </div>
          )}

      </main>

    </div>
  );
}

export default ClinicFeedback;