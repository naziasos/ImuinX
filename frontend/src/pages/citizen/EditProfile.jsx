
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

const emptyFormData = {
  name: "",
  phoneNumber: "",
  dateOfBirth: "",
  bloodType: "",
  allergies: "",
  address: { ...emptyAddress },
};

function normalizeProfile(profile = {}) {
  return {
    name: profile.name || "",
    phoneNumber: profile.phoneNumber || "",
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
      : "",
    bloodType: profile.bloodType || "",
    allergies: profile.allergies || "",
    address: {
      ...emptyAddress,
      ...(profile.address || {}),
    },
  };
}

function EditProfile({ onBack }) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    address: { ...emptyAddress },
  });

  const [originalFormData, setOriginalFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");

  // Load the saved profile from the backend.
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/auth/profile");
        const profile = response.data?.profile;

        if (!profile) {
          throw new Error("Profile data was not returned by the server.");
        }

        if (!active) return;

        const profileData = normalizeProfile(profile);

        setFormData(profileData);
        setOriginalFormData(profileData);
        setEmail(profile.email || "");
      } catch (err) {
        console.error(
          "Load profile error:",
          err.response?.data || err.message || err
        );

        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load your profile. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Display the cached email while the profile is loading.
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );
      setEmail(savedUser.email || "");
    } catch {
      setEmail("");
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  // Handle personal information fields.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // Handle address fields separately.
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

  // Cancel edits and restore the latest saved profile.
  const handleCancel = () => {
    if (originalFormData) {
      setFormData({
        ...originalFormData,
        address: { ...originalFormData.address },
      });
    }

    setError("");
    setSuccess("");
  };

  // Save changes to the backend.
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
        bloodType: formData.bloodType || null,
        allergies: formData.allergies.trim(),
        address: Object.fromEntries(
          Object.entries(formData.address).map(([key, value]) => [
            key,
            typeof value === "string" ? value.trim() || null : null,
          ])
        ),
      };

      const response = await api.patch("/auth/profile", payload);
      const updatedProfile = response.data?.profile;

      if (!updatedProfile) {
        throw new Error("Updated profile was not returned by the server.");
      }

      // Use the server's saved data as the new original profile.
      const savedProfileData = normalizeProfile(updatedProfile);

      setFormData(savedProfileData);
      setOriginalFormData(savedProfileData);

      // Update cached user information without changing email or role.
      try {
        const savedUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...savedUser,
            name: updatedProfile.name ?? savedUser.name,
            phoneNumber: updatedProfile.phoneNumber ?? null,
            dateOfBirth: updatedProfile.dateOfBirth ?? null,
            bloodType: updatedProfile.bloodType ?? "",
            allergies: updatedProfile.allergies ?? "",
            address: updatedProfile.address ?? {},
          })
        );
      } catch (storageError) {
        console.warn("Could not update cached user:", storageError);
      }

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      console.error(
        "Save profile error:",
        err.response?.data || err.message || err
      );

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
                {/* Citizens use the sidebar; other roles still get a back button */}
        {onBack && (
          <button
            type="button"
            className="edit-profile-back"
            onClick={onBack}
          >
            ← Back to Dashboard
          </button>
        )}

        <header className="edit-profile-heading">
          <span className="edit-profile-eyebrow">
            ACCOUNT SETTINGS
          </span>
          <h1>Edit Your Profile</h1>
          <p>
            Keep your personal and contact information up to date.
          </p>
        </header>

        <form
          className="edit-profile-card"
          onSubmit={handleSubmit}
        >
          <div className="edit-profile-section-heading">
            <div className="edit-profile-icon">👤</div>
            <div>
              <h2>Personal Information</h2>
              <p>
                Update your basic details and contact information.
              </p>
            </div>
          </div>

          {error && (
            <div
              className="edit-profile-alert edit-profile-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="edit-profile-alert edit-profile-success"
              role="status"
            >
              {success}
            </div>
          )}

          <div className="edit-profile-grid">
            <div className="edit-profile-field">
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                name="name"
                type="text"
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
                type="email"
                value={email}
                readOnly
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
              <label htmlFor="profile-blood-type">
                Blood Group
              </label>
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

            <div className="edit-profile-field">
              <label htmlFor="profile-allergies">Allergies</label>
              <input
                id="profile-allergies"
                name="allergies"
                type="text"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="List any known allergies"
              />
            </div>
          </div>

          <div className="edit-profile-divider" />

          <div className="edit-profile-section-heading">
            <div className="edit-profile-icon">📍</div>
            <div>
              <h2>Address Information</h2>
              <p>
                Add or update your residential address.
              </p>
            </div>
          </div>

          <div className="edit-profile-grid">
            <div className="edit-profile-field edit-profile-full">
              <label htmlFor="profile-street">
                Street / House
              </label>
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
              onClick={handleCancel}
              disabled={saving || !originalFormData}
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
