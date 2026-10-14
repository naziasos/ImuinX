
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
    bloodType: "",
    address: { ...emptyAddress },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handlePasswordInputChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError("Both current and new passwords are required.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess(res.data.message || "Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

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
            bloodType: profile.bloodType || "",
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
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.slice(0, 10) : null,
        bloodType: formData.bloodType || null,
        address: Object.fromEntries(
          Object.entries(formData.address).map(([key, value]) => [
            key,
            value.trim() || null,
          ])
        ),
      };

      const response = await api.patch("/auth/profile", payload);
      const updatedProfile = response.data?.profile || {};

      // Keep the displayed name in sync with the saved profile.
      try {
        const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...savedUser,
            name: updatedProfile.name || savedUser.name,
            phoneNumber: updatedProfile.phoneNumber,
            dateOfBirth: updatedProfile.dateOfBirth,
            bloodType: updatedProfile.bloodType,
            address: updatedProfile.address,
          })
        );
      } catch (storageErr) {
        console.warn("Storage sync failed:", storageErr);
      }

      setFormData({
        name: updatedProfile.name || "",
        phoneNumber: updatedProfile.phoneNumber || "",
        dateOfBirth: updatedProfile.dateOfBirth
          ? new Date(updatedProfile.dateOfBirth).toISOString().slice(0, 10)
          : "",
        bloodType: updatedProfile.bloodType || "",
        address: {
          ...emptyAddress,
          ...((typeof updatedProfile.address === "object" && updatedProfile.address) || {}),
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
            <div className="edit-profile-field">
              <label htmlFor="profile-blood-type">Blood Group</label>
              <select
                id="profile-blood-type"
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
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
        {/* Change Password Card */}
        <form
          className="edit-profile-card"
          style={{ marginTop: "2rem" }}
          onSubmit={handlePasswordSubmit}
        >
          <div className="edit-profile-section-heading">
            <div className="edit-profile-icon">🔒</div>
            <div>
              <h2>Change Password</h2>
              <p>Update your password to keep your account secure.</p>
            </div>
          </div>

          {passwordError && (
            <div className="edit-profile-alert edit-profile-error">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="edit-profile-alert edit-profile-success">
              {passwordSuccess}
            </div>
          )}

          <div className="edit-profile-grid">
            <div className="edit-profile-field edit-profile-full">
              <label htmlFor="current-password">Current Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="current-password"
                  name="currentPassword"
                  type={showPassword.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="Enter current password"
                  required
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#6b7280",
                    padding: 0,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword.current ? (
                    /* Eye Off (লুকানো অবস্থা) */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* Eye Open (দেখানোর অবস্থা) */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="edit-profile-field">
              <label htmlFor="new-password">New Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="Enter new password"
                  required
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => ({ ...prev, new: !prev.new }))}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#6b7280",
                    padding: 0,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword.new ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <small>
                Min 8 chars (uppercase, lowercase, number, special char).
              </small>
            </div>

            <div className="edit-profile-field">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="Confirm new password"
                  required
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#6b7280",
                    padding: 0,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword.confirm ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="edit-profile-actions">
            <button
              type="submit"
              className="edit-profile-save"
              disabled={changingPassword}
            >
              {changingPassword ? "Updating..." : "Update Password"}
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