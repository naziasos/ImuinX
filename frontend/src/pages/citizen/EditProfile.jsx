
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import "./EditProfile.css";

const emptyAddress = {
  street: "",
  area: "",
  city: "",
  district: "",
  postalCode: "",
  country: "",
};

function EditProfile({ onBack }) {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    dateOfBirth: "",
    address: { ...emptyAddress },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/auth/profile");
        const profile = response.data.profile;

        if (!active) return;

        setFormData({
          name: profile.name || "",
          phoneNumber: profile.phoneNumber || "",
          dateOfBirth: profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
            : "",
          address: {
            ...emptyAddress,
            ...(profile.address || {}),
          },
        });
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load your profile. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [name]: value,
      },
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        address: Object.fromEntries(
          Object.entries(formData.address).map(([key, value]) => [
            key,
            value.trim() || null,
          ])
        ),
      };

      const response = await api.patch("/auth/profile", payload);
      const updatedProfile = response.data.profile;

      // Keep the displayed name in sync with the saved profile.
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...savedUser,
          name: updatedProfile.name,
          phoneNumber: updatedProfile.phoneNumber,
          dateOfBirth: updatedProfile.dateOfBirth,
          address: updatedProfile.address,
        })
      );

      setFormData({
        name: updatedProfile.name || "",
        phoneNumber: updatedProfile.phoneNumber || "",
        dateOfBirth: updatedProfile.dateOfBirth
          ? new Date(updatedProfile.dateOfBirth).toISOString().slice(0, 10)
          : "",
        address: {
          ...emptyAddress,
          ...(updatedProfile.address || {}),
        },
      });

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-profile-page">
        <div className="edit-profile-card edit-profile-message">
          Loading your profile...
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <main className="edit-profile-container">
        <button
          type="button"
          className="edit-profile-back"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <header className="edit-profile-heading">
          <span className="edit-profile-eyebrow">ACCOUNT SETTINGS</span>
          <h1>Edit Your Profile</h1>
          <p>Keep your personal and contact information up to date.</p>
        </header>

        <form className="edit-profile-card" onSubmit={handleSubmit}>
          <div className="edit-profile-section-heading">
            <div className="edit-profile-icon">👤</div>
            <div>
              <h2>Personal Information</h2>
              <p>Update your basic details and contact information.</p>
            </div>
          </div>

          {error && (
            <div className="edit-profile-alert edit-profile-error">
              {error}
            </div>
          )}

          {success && (
            <div className="edit-profile-alert edit-profile-success">
              {success}
            </div>
          )}

          <div className="edit-profile-grid">
            <div className="edit-profile-field">
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-email">Email Address</label>
              <input
                id="profile-email"
                value={
                  JSON.parse(localStorage.getItem("user") || "{}").email || ""
                }
                disabled
              />
              <small>Email address cannot be changed here.</small>
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-dob">Date of Birth</label>
              <input
                id="profile-dob"
                name="dateOfBirth"
                type="date"
                max={new Date().toLocaleDateString("en-CA")}
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="edit-profile-divider" />

          <div className="edit-profile-section-heading">
            <div className="edit-profile-icon">📍</div>
            <div>
              <h2>Address Information</h2>
              <p>Add or update your residential address.</p>
            </div>
          </div>

          <div className="edit-profile-grid">
            <div className="edit-profile-field edit-profile-full">
              <label htmlFor="profile-street">Street / House</label>
              <input
                id="profile-street"
                name="street"
                value={formData.address.street || ""}
                onChange={handleAddressChange}
                placeholder="House number, street"
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-area">Area</label>
              <input
                id="profile-area"
                name="area"
                value={formData.address.area || ""}
                onChange={handleAddressChange}
                placeholder="Area or neighborhood"
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-city">City</label>
              <input
                id="profile-city"
                name="city"
                value={formData.address.city || ""}
                onChange={handleAddressChange}
                placeholder="City"
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-district">District</label>
              <input
                id="profile-district"
                name="district"
                value={formData.address.district || ""}
                onChange={handleAddressChange}
                placeholder="District"
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="profile-postal">Postal Code</label>
              <input
                id="profile-postal"
                name="postalCode"
                value={formData.address.postalCode || ""}
                onChange={handleAddressChange}
                placeholder="Postal code"
              />
            </div>

            <div className="edit-profile-field edit-profile-full">
              <label htmlFor="profile-country">Country</label>
              <input
                id="profile-country"
                name="country"
                value={formData.address.country || ""}
                onChange={handleAddressChange}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="edit-profile-actions">
            <button
              type="button"
              className="edit-profile-cancel"
              onClick={onBack}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="edit-profile-save"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        <p className="edit-profile-note">
          ImuniX · Your information, managed securely
        </p>
      </main>
    </div>
  );
}

export default EditProfile;