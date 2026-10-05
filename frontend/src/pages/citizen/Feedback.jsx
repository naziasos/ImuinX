import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../services/api";
import "./Feedback.css";

// Must match ALLOWED_TAGS in backend/routes/feedbackRoutes.js
const TAGS = [
  { value: "Staff Behavior", icon: "🤝" },
  { value: "Waiting Time", icon: "⏱️" },
  { value: "Cleanliness", icon: "✨" },
  { value: "Process", icon: "📋" },
  { value: "Information", icon: "💡" },
  { value: "Other", icon: "💭" },
];

const RATING_LABELS = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];
const MAX_COMMENT = 1000;

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Stars({ value, size = 16 }) {
  return (
    <span className="fb-stars-static" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{ fontSize: size }}
          className={n <= value ? "on" : ""}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function whoFor(item) {
  return item.citizenId?.name || "Vaccinated person";
}

function Feedback({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [tab, setTab] = useState("pending");
  const [activeId, setActiveId] = useState(null);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const pending = useMemo(
    () => items.filter((i) => i.promptStatus === "Pending"),
    [items]
  );
  const submitted = useMemo(
    () => items.filter((i) => i.promptStatus === "Submitted"),
    [items]
  );
  const active = pending.find((i) => i._id === activeId) || null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const res = await api.get("/feedback/my");
      const list = res.data.feedback || [];
      setItems(list);
      const firstPending = list.find((i) => i.promptStatus === "Pending");
      setActiveId((cur) =>
        list.some((i) => i._id === cur && i.promptStatus === "Pending")
          ? cur
          : firstPending?._id || null
      );
      if (!firstPending && list.length > 0) setTab("submitted");
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const resetForm = () => {
    setRating(0);
    setHover(0);
    setTags([]);
    setComment("");
    setIsAnonymous(false);
    setFormError("");
  };

  const selectItem = (id) => {
    setActiveId(id);
    resetForm();
  };

  const toggleTag = (tag) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!active) return;
    if (rating === 0) {
      setFormError("Please choose a star rating before submitting.");
      return;
    }
    try {
      setBusy(true);
      setFormError("");
      await api.patch(`/feedback/${active._id}/submit`, {
        rating,
        comment: comment.trim(),
        tags,
        isAnonymous,
      });
      setToast("Thank you! Your feedback was sent to the clinic.");
      resetForm();
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLater = async () => {
    if (!active) return;
    try {
      setBusy(true);
      setFormError("");
      await api.patch(`/feedback/${active._id}/dismiss`);
      setToast("No problem — we'll keep this for later.");
      // Move on to the next pending item if there is one
      const next = pending.find((i) => i._id !== active._id);
      resetForm();
      setActiveId(next?._id || null);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fb-page">
      <div className="fb-shell">
        <header className="fb-top">
          <button className="fb-back" onClick={onBack}>
            ← Back to dashboard
          </button>
          <div className="fb-title">
            <h1>Your feedback</h1>
            <p>Tell us how your vaccination visit went and see how clinics respond.</p>
          </div>
        </header>

        <div className="fb-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "pending"}
            className={tab === "pending" ? "active" : ""}
            onClick={() => setTab("pending")}
          >
            To review
            <span className="fb-count">{pending.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "submitted"}
            className={tab === "submitted" ? "active" : ""}
            onClick={() => setTab("submitted")}
          >
            My feedback
            <span className="fb-count">{submitted.length}</span>
          </button>
        </div>

        {loading && (
          <div className="fb-state">
            <div className="fb-spinner" />
            <p>Loading your feedback…</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="fb-state">
            <p className="fb-error-text">{loadError}</p>
            <button className="fb-btn primary" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && tab === "pending" && (
          <>
            {pending.length === 0 ? (
              <div className="fb-state">
                <div className="fb-state-icon">🎉</div>
                <h2>You're all caught up</h2>
                <p>
                  After a dose is recorded at a clinic, you'll be able to
                  rate that visit here.
                </p>
              </div>
            ) : (
              <div className="fb-layout">
                <aside className="fb-list" aria-label="Visits waiting for feedback">
                  {pending.map((item) => (
                    <button
                      key={item._id}
                      className={`fb-visit ${item._id === activeId ? "selected" : ""}`}
                      onClick={() => selectItem(item._id)}
                    >
                      <span className="fb-visit-icon">💉</span>
                      <span className="fb-visit-body">
                        <strong>{item.vaccineType}</strong>
                        <small>{whoFor(item)}</small>
                        <small>
                          {item.clinicId?.name || "Clinic"} ·{" "}
                          {formatDate(item.doseRecordId?.dateAdministered || item.createdAt)}
                        </small>
                      </span>
                    </button>
                  ))}
                </aside>

                {active ? (
                  <form className="fb-form" onSubmit={handleSubmit} noValidate>
                    <div className="fb-summary">
                      <div>
                        <small>Vaccine</small>
                        <strong>{active.vaccineType}</strong>
                      </div>
                      <div>
                        <small>For</small>
                        <strong>{whoFor(active)}</strong>
                      </div>
                      <div>
                        <small>Clinic</small>
                        <strong>{active.clinicId?.name || "—"}</strong>
                      </div>
                      <div>
                        <small>Date</small>
                        <strong>
                          {formatDate(active.doseRecordId?.dateAdministered || active.createdAt)}
                        </strong>
                      </div>
                    </div>

                    <section>
                      <h2>How was your visit?</h2>
                      <div className="fb-rate" onMouseLeave={() => setHover(0)}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={n <= (hover || rating) ? "on" : ""}
                            onClick={() => setRating(n)}
                            onMouseEnter={() => setHover(n)}
                            aria-label={`${n} star${n > 1 ? "s" : ""}`}
                            aria-pressed={rating === n}
                          >
                            ★
                          </button>
                        ))}
                        <span className="fb-rate-label">
                          {RATING_LABELS[hover || rating] || "Tap a star"}
                        </span>
                      </div>
                    </section>

                    <section>
                      <h2>
                        What was it about? <span className="fb-opt">optional</span>
                      </h2>
                      <div className="fb-chips">
                        {TAGS.map(({ value, icon }) => (
                          <button
                            key={value}
                            type="button"
                            className={tags.includes(value) ? "selected" : ""}
                            onClick={() => toggleTag(value)}
                            aria-pressed={tags.includes(value)}
                          >
                            <span>{icon}</span>
                            {value}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h2>
                        Anything else? <span className="fb-opt">optional</span>
                      </h2>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={MAX_COMMENT}
                        rows={4}
                        placeholder="Share what went well or what could be better…"
                      />
                      <div className="fb-counter">
                        {comment.length}/{MAX_COMMENT}
                      </div>
                    </section>

                    <label className="fb-anon">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                      />
                      <span>
                        <strong>Send anonymously</strong>
                        <small>The clinic won't see your name with this feedback.</small>
                      </span>
                    </label>

                    {formError && (
                      <div className="fb-alert" role="alert">
                        {formError}
                      </div>
                    )}

                    <div className="fb-actions">
                      <button
                        type="button"
                        className="fb-btn ghost"
                        onClick={handleLater}
                        disabled={busy}
                      >
                        Maybe later
                      </button>
                      <button type="submit" className="fb-btn primary" disabled={busy}>
                        {busy ? "Sending…" : "Submit feedback"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="fb-state fb-form-empty">
                    <p>Select a visit on the left to leave feedback.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !loadError && tab === "submitted" && (
          <>
            {submitted.length === 0 ? (
              <div className="fb-state">
                <div className="fb-state-icon">💬</div>
                <h2>No feedback sent yet</h2>
                <p>Feedback you submit will appear here along with any reply from the clinic.</p>
              </div>
            ) : (
              <div className="fb-history">
                {submitted.map((item) => (
                  <article className="fb-card" key={item._id}>
                    <div className="fb-card-head">
                      <div>
                        <strong>{item.vaccineType}</strong>
                        <small>
                          {whoFor(item)} · {item.clinicId?.name || "Clinic"} ·{" "}
                          {formatDate(item.submittedAt)}
                        </small>
                      </div>
                      <span className={`fb-status ${item.reviewStatus.toLowerCase()}`}>
                        {item.reviewStatus === "New" ? "Sent" : item.reviewStatus}
                      </span>
                    </div>

                    <Stars value={item.rating} size={20} />

                    {item.tags?.length > 0 && (
                      <div className="fb-tagrow">
                        {item.tags.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                    )}

                    {item.comment && <p className="fb-comment">{item.comment}</p>}
                    {item.isAnonymous && (
                      <small className="fb-anon-note">🕶️ Sent anonymously</small>
                    )}

                    {item.responses?.length > 0 && (
                      <div className="fb-replies">
                        {item.responses.map((r) => (
                          <div className="fb-reply" key={r._id}>
                            <div className="fb-reply-head">
                              <strong>Clinic reply</strong>
                              <small>{formatDate(r.createdAt)}</small>
                            </div>
                            <p>{r.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fb-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default Feedback;
