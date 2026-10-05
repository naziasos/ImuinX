import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../../services/api";
import "../citizen/Feedback.css";
import "./ClinicFeedback.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Stars({ value }) {
  return (
    <span className="fb-stars-static" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}

const STATUS_FILTERS = ["", "New", "Responded", "Resolved"];
const RATING_FILTERS = ["", "5", "4", "3", "2", "1"];

function ClinicFeedback({ onBack }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewStatus, setReviewStatus] = useState("");
  const [rating, setRating] = useState("");

  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (reviewStatus) params.reviewStatus = reviewStatus;
      if (rating) params.rating = rating;
      const [list, sum] = await Promise.all([
        api.get("/feedback/clinic/list", { params }),
        api.get("/feedback/clinic/summary"),
      ]);
      setItems(list.data.feedback || []);
      setSummary(sum.data.summary);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [reviewStatus, rating]);

  useEffect(() => {
    load();
  }, [load]);

  const setRowMsg = (id, msg) => setRowError((p) => ({ ...p, [id]: msg }));

  const sendReply = async (id) => {
    const message = (drafts[id] || "").trim();
    if (!message) {
      setRowMsg(id, "Write a reply first.");
      return;
    }
    try {
      setBusyId(id);
      setRowMsg(id, "");
      await api.post(`/feedback/${id}/respond`, { message });
      setDrafts((p) => ({ ...p, [id]: "" }));
      await load();
    } catch (err) {
      setRowMsg(id, errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (id) => {
    try {
      setBusyId(id);
      setRowMsg(id, "");
      await api.patch(`/feedback/${id}/resolve`);
      await load();
    } catch (err) {
      setRowMsg(id, errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const bars = summary
    ? [
        [5, summary.fiveStar],
        [4, summary.fourStar],
        [3, summary.threeStar],
        [2, summary.twoStar],
        [1, summary.oneStar],
      ]
    : [];

  return (
    <div className="fb-page">
      <div className="fb-shell">
        <header className="fb-top">
          <button className="fb-back" onClick={onBack}>
            ← Back to dashboard
          </button>
          <div className="fb-title">
            <h1>Patient feedback</h1>
            <p>See what patients say about your clinic and reply to them.</p>
          </div>
        </header>

        {summary && (
          <section className="cf-summary">
            <div className="cf-score">
              <strong>{summary.total ? summary.averageRating.toFixed(1) : "—"}</strong>
              <Stars value={Math.round(summary.averageRating || 0)} />
              <small>
                {summary.total} review{summary.total === 1 ? "" : "s"}
              </small>
            </div>
            <div className="cf-bars">
              {bars.map(([star, count]) => (
                <div key={star} className="cf-bar-row">
                  <span>{star}★</span>
                  <div className="cf-bar">
                    <i style={{ width: summary.total ? `${(count / summary.total) * 100}%` : 0 }} />
                  </div>
                  <span className="cf-bar-n">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="cf-filters">
          <label>
            Status
            <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s || "All"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rating
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {RATING_FILTERS.map((r) => (
                <option key={r} value={r}>
                  {r ? `${r} stars` : "All"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && (
          <div className="fb-state">
            <div className="fb-spinner" />
            <p>Loading feedback…</p>
          </div>
        )}

        {!loading && error && (
          <div className="fb-state">
            <p className="fb-error-text">{error}</p>
            <button className="fb-btn primary" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="fb-state">
            <div className="fb-state-icon">📭</div>
            <h2>No feedback found</h2>
            <p>Feedback appears here once patients submit it after a vaccination.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="cf-list">
            {items.map((item) => {
              const author = item.isAnonymous
                ? "Anonymous"
                : item.userId?.name || item.citizenId?.name || "Patient";
              const busy = busyId === item._id;
              return (
                <article className="fb-card" key={item._id}>
                  <div className="fb-card-head">
                    <div>
                      <strong>{author}</strong>
                      <small>
                        {item.vaccineType} · {formatDate(item.submittedAt)}
                      </small>
                    </div>
                    <span className={`fb-status ${item.reviewStatus.toLowerCase()}`}>
                      {item.reviewStatus}
                    </span>
                  </div>

                  <Stars value={item.rating} />

                  {item.tags?.length > 0 && (
                    <div className="fb-tagrow">
                      {item.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  )}

                  {item.comment ? (
                    <p className="fb-comment">{item.comment}</p>
                  ) : (
                    <p className="fb-comment cf-muted">No written comment.</p>
                  )}

                  {item.responses?.length > 0 && (
                    <div className="fb-replies">
                      {item.responses.map((r) => (
                        <div className="fb-reply" key={r._id}>
                          <div className="fb-reply-head">
                            <strong>{r.responderId?.name || r.responderRole}</strong>
                            <small>{formatDate(r.createdAt)}</small>
                          </div>
                          <p>{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.reviewStatus !== "Resolved" && (
                    <div className="cf-reply-box">
                      <textarea
                        rows={2}
                        maxLength={1000}
                        placeholder="Write a reply to the patient…"
                        value={drafts[item._id] || ""}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [item._id]: e.target.value }))
                        }
                      />
                      {rowError[item._id] && (
                        <div className="fb-alert" role="alert">
                          {rowError[item._id]}
                        </div>
                      )}
                      <div className="fb-actions">
                        <button
                          className="fb-btn ghost"
                          disabled={busy}
                          onClick={() => resolve(item._id)}
                        >
                          Mark resolved
                        </button>
                        <button
                          className="fb-btn primary"
                          disabled={busy}
                          onClick={() => sendReply(item._id)}
                        >
                          {busy ? "Working…" : "Send reply"}
                        </button>
                      </div>
                    </div>
                  )}

                  {item.reviewStatus === "Resolved" && item.resolvedAt && (
                    <small className="fb-anon-note">
                      ✅ Resolved on {formatDate(item.resolvedAt)}
                    </small>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClinicFeedback;
