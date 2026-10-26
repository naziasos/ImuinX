
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import FeedbackPopup from "../../components/FeedbackPopup";
import PageHeader from "../../components/PageHeader";
import Icon from "../../components/Icons";

const RequestInHouseVisit = ({ onSuccess, onOpenFeedback }) => {

  const [familyMembers, setFamilyMembers] = useState([]);

  const [formData, setFormData] = useState({
    forFamilyMember: false,
    familyMemberId: "",
    address: "",
    location: "",
    preferredDate: "",
    vaccineOrReason: "",
  });

  const [errors, setErrors] = useState({});
  // Bumped after a request that earned a feedback prompt
  const [feedbackKey, setFeedbackKey] = useState(0);

  // Opens "My In-House Requests" (page state lives in App.jsx)
  const goToMyRequests = () => onSuccess?.();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch linked family members
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const { data } = await api.get("/family");
        setFamilyMembers(data.familyMembers || data.data || data || []);
      } catch (err) {
        console.error("Error fetching family members:", err);
      }
    };

    fetchFamilyMembers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.forFamilyMember && !formData.familyMemberId) {
      newErrors.familyMemberId = "Please select a family member.";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required.";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required.";
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = "Preferred date and time is required.";
    } else {
      const selectedDate = new Date(formData.preferredDate);

      if (selectedDate <= new Date()) {
        newErrors.preferredDate =
          "Preferred date and time must be in the future.";
      }
    }

    if (!formData.vaccineOrReason.trim()) {
      newErrors.vaccineOrReason =
        "Vaccine name or reason is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/in-house-requests", {
        familyMember: formData.forFamilyMember
          ? formData.familyMemberId
          : null,
        address: formData.address.trim(),
        location: formData.location.trim(),
        preferredDate: formData.preferredDate,
        vaccineOrReason: formData.vaccineOrReason.trim(),
      });

      setSuccess(
        response.data?.message ||
          "In-house visit requested successfully!"
      );

      if (response.data?.feedback) {
        // The popup sends the citizen on when it closes
        setFeedbackKey((key) => key + 1);
      } else {
        setTimeout(goToMyRequests, 1500);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit in-house visit request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        icon="home"
        eyebrow="Home visits"
        title="Request In-House Visit"
        description="Can't make it to a clinic? A health worker can visit you or a family member at home."
      />

      <div className="cz-grid-main">
        <section className="cz-card">
          {error && (
            <div className="cz-alert cz-alert--error" role="alert">
              <Icon name="alert" size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="cz-alert cz-alert--success" role="status">
              <Icon name="check" size={20} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Self / Family Member */}
            <label className="cz-check" htmlFor="forFamilyMember">
              <input
                type="checkbox"
                name="forFamilyMember"
                id="forFamilyMember"
                checked={formData.forFamilyMember}
                onChange={handleChange}
              />
              <span>Request this visit for a family member instead of yourself</span>
            </label>

            {/* Family Member */}
            {formData.forFamilyMember && (
              <div className="cz-field">
                <label className="cz-label" htmlFor="familyMemberId">
                  Select family member
                </label>

                <select
                  id="familyMemberId"
                  name="familyMemberId"
                  className="cz-select"
                  value={formData.familyMemberId}
                  onChange={handleChange}
                >
                  <option value="">-- Choose family member --</option>

                  {familyMembers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} (
                      {member.relation || member.relationship || "Family Member"}
                      )
                    </option>
                  ))}
                </select>

                {errors.familyMemberId && (
                  <p className="cz-hint cz-hint--error">{errors.familyMemberId}</p>
                )}
              </div>
            )}

            {/* Address */}
            <div className="cz-field">
              <label className="cz-label" htmlFor="visit-address">
                Visit address
              </label>

              <textarea
                id="visit-address"
                name="address"
                className="cz-textarea"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                placeholder="Enter full street address, house/apartment number"
              />

              {errors.address && (
                <p className="cz-hint cz-hint--error">{errors.address}</p>
              )}
            </div>

            {/* Location */}
            <div className="cz-field">
              <label className="cz-label" htmlFor="visit-location">
                Location
              </label>

              <input
                id="visit-location"
                type="text"
                name="location"
                className="cz-input"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Dhaka, Mirpur"
              />

              {errors.location && (
                <p className="cz-hint cz-hint--error">{errors.location}</p>
              )}
            </div>

            {/* Preferred Date */}
            <div className="cz-field">
              <label className="cz-label" htmlFor="visit-date">
                Preferred date &amp; time
              </label>

              <input
                id="visit-date"
                type="datetime-local"
                name="preferredDate"
                className="cz-input"
                value={formData.preferredDate}
                onChange={handleChange}
              />

              {errors.preferredDate && (
                <p className="cz-hint cz-hint--error">{errors.preferredDate}</p>
              )}
            </div>

            {/* Vaccine / Reason */}
            <div className="cz-field">
              <label className="cz-label" htmlFor="visit-reason">
                Vaccine name / reason for visit
              </label>

              <input
                id="visit-reason"
                type="text"
                name="vaccineOrReason"
                className="cz-input"
                value={formData.vaccineOrReason}
                onChange={handleChange}
                placeholder="e.g., Covid-19 Booster or General Health Check"
              />

              {errors.vaccineOrReason && (
                <p className="cz-hint cz-hint--error">{errors.vaccineOrReason}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="cz-btn cz-btn--primary cz-btn--block"
            >
              {loading ? "Submitting…" : "Submit in-house request"}
            </button>
          </form>
        </section>

        {/* How it works */}
        <aside className="cz-card cz-card--soft">
          <div className="cz-card__head">
            <h2>How it works</h2>
          </div>

          <ol className="cz-how">
            <li>
              <span>1</span>
              <div>
                <strong>Send your request</strong>
                <p>Tell us where you are, when you prefer and which vaccine you need.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>A health worker accepts</strong>
                <p>You'll be notified as soon as a worker is assigned to your visit.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Get vaccinated at home</strong>
                <p>Your dose is recorded and your certificate is created automatically.</p>
              </div>
            </li>
          </ol>

          {onSuccess && (
            <button
              type="button"
              className="cz-btn cz-btn--secondary cz-btn--block"
              style={{ marginTop: 8 }}
              onClick={onSuccess}
            >
              <Icon name="clipboard" size={17} /> View my requests
            </button>
          )}
        </aside>
      </div>

      <FeedbackPopup
        type="InHouse"
        delay={0}
        enabled={feedbackKey > 0}
        refreshKey={feedbackKey}
        onOpenFeedback={onOpenFeedback}
        onClose={goToMyRequests}
      />
    </>
  );
};

export default RequestInHouseVisit;