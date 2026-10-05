import React, { useState } from "react";
import "./Feedback.css";

const feedbackTags = [
  "Staff Friendly",
  "Short Waiting Time",
  "Clean Clinic",
  "Good Service",
  "Helpful Staff",
  "Easy Process",
];

function Feedback({ onBack }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Please select a rating.");
      return;
    }

    setSubmitted(true);
  };

  // Success screen
  if (submitted) {
    return (
      <div className="feedback-page">
        <div className="feedback-orb orb-one"></div>
        <div className="feedback-orb orb-two"></div>
        <div className="feedback-orb orb-three"></div>

        <div className="feedback-success-card">
          <div className="success-icon">✓</div>

          <h1>Thank You!</h1>

          <p>
            Your feedback has been submitted successfully.
          </p>

          <button
            className="feedback-dashboard-btn"
            onClick={onBack}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      {/* Animated Background */}
      <div className="feedback-orb orb-one"></div>
      <div className="feedback-orb orb-two"></div>
      <div className="feedback-orb orb-three"></div>

      <div className="feedback-container">

        {/* Header */}
        <div className="feedback-header">
          <div className="feedback-badge">
            💬 Your Voice Matters
          </div>

          <h1>Share Your Feedback</h1>

          <p>
            Help us improve your vaccination experience at ImuniX.
          </p>
        </div>

        {/* Clinic / Vaccine Info */}
        <div className="feedback-info-card">
          <div className="info-item">
            <span className="info-icon">💉</span>

            <div>
              <small>Vaccine</small>
              <strong>OPV</strong>
            </div>
          </div>

          <div className="info-divider"></div>

          <div className="info-item">
            <span className="info-icon">🏥</span>

            <div>
              <small>Clinic</small>
              <strong>ImuniX Clinic</strong>
            </div>
          </div>

          <div className="info-divider"></div>

          <div className="info-item">
            <span className="info-icon">📅</span>

            <div>
              <small>Date</small>
              <strong>05 Oct 2026</strong>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <form
          className="feedback-card"
          onSubmit={handleSubmit}
        >

          {/* Rating */}
          <div className="feedback-section">
            <div className="section-heading">
              <span className="section-number">01</span>

              <div>
                <h2>How was your experience?</h2>
                <p>Please rate your overall vaccination experience.</p>
              </div>
            </div>

            <div className="stars-container">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-button ${
                    star <= (hoverRating || rating)
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${star} out of 5`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="rating-text">
              {rating === 0 && "Select a rating"}
              {rating === 1 && "Very Poor"}
              {rating === 2 && "Poor"}
              {rating === 3 && "Average"}
              {rating === 4 && "Good"}
              {rating === 5 && "Excellent"}
            </div>
          </div>

          {/* Tags */}
          <div className="feedback-section">
            <div className="section-heading">
              <span className="section-number">02</span>

              <div>
                <h2>What did you like?</h2>
                <p>Select all that apply.</p>
              </div>
            </div>

            <div className="feedback-tags">
              {feedbackTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`feedback-tag ${
                    selectedTags.includes(tag)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {selectedTags.includes(tag) ? "✓ " : ""}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="feedback-section">
            <div className="section-heading">
              <span className="section-number">03</span>

              <div>
                <h2>Tell us more</h2>
                <p>
                  Your comments help us understand your experience better.
                </p>
              </div>
            </div>

            <textarea
              className="feedback-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your feedback here..."
              rows="5"
              maxLength="500"
            />

            <div className="character-count">
              {comment.length}/500
            </div>
          </div>

          {/* Anonymous */}
          <div className="anonymous-box">
            <label className="anonymous-label">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) =>
                  setIsAnonymous(e.target.checked)
                }
              />

              <span className="custom-checkbox"></span>

              <span>
                <strong>Submit anonymously</strong>
                <small>
                  Your name will not be shown with this feedback.
                </small>
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="feedback-actions">

            {/* Cancel */}
            <button
              type="button"
              className="feedback-cancel-btn"
              onClick={onBack}
            >
              Cancel
            </button>

            {/* Submit */}
            <button
              type="submit"
              className="feedback-submit-btn"
            >
              <span>Submit Feedback</span>
              <span className="submit-arrow">→</span>
            </button>

          </div>

        </form>

        {/* Bottom Note */}
        <div className="feedback-footer-note">
          🔒 Your feedback is valuable and will help improve ImuniX services.
        </div>

      </div>
    </div>
  );
}

export default Feedback;