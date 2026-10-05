import { useEffect, useState } from "react";
import { api, errorMessage } from "../services/api";
import "./FeedbackPopup.css";

// Must match ALLOWED_TAGS in backend/routes/feedbackRoutes.js
const TAGS = [
  "Staff Behavior",
  "Waiting Time",
  "Cleanliness",
  "Process",
  "Information",
  "Other",
];
const LABELS = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];

// After "Maybe later", don't ask again for this long (it stays in the Feedback page)
const SNOOZE_MS = 24 * 60 * 60 * 1000;
// Stop auto-popping after this many "Maybe later" taps
const MAX_DISMISSALS = 3;
// Small pause so the certificate is seen first
const SHOW_DELAY_MS = 1200;

function canPrompt(item) {
  if (item.dismissCount >= MAX_DISMISSALS) return false;
  if (!item.lastDismissedAt) return true;
  return Date.now() - new Date(item.lastDismissedAt).getTime() > SNOOZE_MS;
}

/**
 * Pops up automatically once the citizen has reached their certificate and
 * still has a vaccination waiting for feedback.
 *   <FeedbackPopup enabled={!loading && !error} onOpenFeedback={...} />
 */
function FeedbackPopup({ enabled = true, onOpenFeedback }) {
  const [item, setItem] = useState(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    let timer;

    api
      .get("/feedback/my-pending")
      .then((res) => {
        if (!active) return;
        const list = (res.data.feedback || []).filter(canPrompt);
        if (list.length === 0) return;
        setItem(list[0]);
        setMore(list.length - 1);
        timer = setTimeout(() => active && setOpen(true), SHOW_DELAY_MS);
      })
      .catch(() => {
        /* a failed prompt lookup must never get in the user's way */
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [enabled]);

  if (!open || !item) return null;

  const close = () => setOpen(false);

  const later = async () => {
    try {
      await api.patch(`/feedback/${item._id}/dismiss`);
    } catch {
      /* ignore – just close */
    }
    close();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await api.patch(`/feedback/${item._id}/submit`, {
        rating,
        comment: comment.trim(),
        tags,
        isAnonymous,
      });
      setDone(true);
      setTimeout(close, 2200);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleTag = (t) =>
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const who = item.citizenId?.name;

  return (
    <div className="fbp-backdrop" role="presentation">
      <div
        className="fbp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fbp-title"
      >
        {done ? (
          <div className="fbp-done">
            <div className="fbp-check">✓</div>
            <h2>Thank you!</h2>
            <p>Your feedback helps the clinic improve.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <button
              type="button"
              className="fbp-x"
              onClick={later}
              aria-label="Close and ask me later"
            >
              ×
            </button>

            <div className="fbp-head">
              <span className="fbp-emoji">💉</span>
              <h2 id="fbp-title">How was your vaccination visit?</h2>
              <p>
                {item.vaccineType}
                {who ? ` · ${who}` : ""}
                {item.clinicId?.name ? ` · ${item.clinicId.name}` : ""}
              </p>
            </div>

            <div className="fbp-rate" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n <= (hover || rating) ? "on" : ""}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="fbp-rate-label">
              {LABELS[hover || rating] || "Tap a star to rate"}
            </div>

            {rating > 0 && (
              <div className="fbp-more">
                <div className="fbp-chips">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={tags.includes(t) ? "selected" : ""}
                      onClick={() => toggleTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Anything you'd like to add? (optional)"
                />
                <label className="fbp-anon">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  Send anonymously
                </label>
              </div>
            )}

            {error && (
              <div className="fbp-error" role="alert">
                {error}
              </div>
            )}

            <div className="fbp-actions">
              <button type="button" className="ghost" onClick={later} disabled={busy}>
                Maybe later
              </button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "Sending…" : "Submit"}
              </button>
            </div>

            {more > 0 && onOpenFeedback && (
              <button
                type="button"
                className="fbp-link"
                onClick={() => {
                  close();
                  onOpenFeedback();
                }}
              >
                {more} more visit{more > 1 ? "s" : ""} waiting for feedback →
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default FeedbackPopup;
