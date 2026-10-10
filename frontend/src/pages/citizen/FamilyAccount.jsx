import React, { useEffect, useState } from "react";
import "./FamilyAccount.css";

const emptyAddress = {
  street: "",
  area: "",
  city: "",
  district: "",
  postalCode: "",
  country: "",
};

const createEmptyFormData = () => ({
  name: "",
  dateOfBirth: "",
  gender: "",
  relationship: "",
  phoneNumber: "",
  address: { ...emptyAddress },
});

const formatAddress = (address) => {
  if (!address) return "Not available";

  const parts = [
    address.street,
    address.area,
    address.city,
    address.district,
    address.postalCode,
    address.country,
  ].filter((part) => typeof part === "string" && part.trim());

  return parts.length ? parts.join(", ") : "Not available";
};

const FamilyAccount = ({ onLogout, onBack }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(createEmptyFormData);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/family",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setFamilyMembers(data.familyMembers || []);
        } else {
          alert(data.message || "Failed to load family members.");
        }
      } catch (error) {
        console.error("Error fetching family members:", error);
      }
    };

    fetchFamilyMembers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [name]: value,
      },
    }));
  };

  // Add Family Member — unchanged
  const handleAddMember = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/family",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const newMember = data.familyMember || data;

        setFamilyMembers((previous) => [
          ...previous,
          newMember,
        ]);

        setFormData(createEmptyFormData());
        setShowForm(false);
        setEditingMember(null);

        alert("Family member added successfully!");
      } else {
        alert(data.message || "Failed to add family member.");
      }
    } catch (error) {
      console.error("Error adding family member:", error);
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Profile Form
  const handleEditMember = () => {
    if (!selectedMember) return;

    setFormData({
      name: selectedMember.name || "",
      dateOfBirth: selectedMember.dateOfBirth
        ? selectedMember.dateOfBirth.slice(0, 10)
        : "",
      gender: selectedMember.gender || "",
      relationship: selectedMember.relationship || "",
      phoneNumber: selectedMember.phoneNumber || "",
      address: {
        ...emptyAddress,
        ...(selectedMember.address || {}),
      },
    });

    setEditingMember(selectedMember);
    setSelectedMember(null);
    setShowForm(true);
  };

  
  // Update Family Member
  const handleUpdateMember = async (e) => {
    e.preventDefault();

    if (!editingMember?._id) {
      alert("Could not identify the family member.");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const payload = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        relationship: formData.relationship,
        phoneNumber: formData.phoneNumber.trim(),
        address: {
          street: formData.address.street.trim(),
          area: formData.address.area.trim(),
          city: formData.address.city.trim(),
          district: formData.address.district.trim(),
          postalCode: formData.address.postalCode.trim(),
          country: formData.address.country.trim(),
        },
      };

      const response = await fetch(
        `http://localhost:5000/api/family/${editingMember._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.log("Status:", response.status);
  console.log("Response:", data);

  alert(
    `Status: ${response.status}\n` +
    (data.message || data.error || JSON.stringify(data))
  );
  return;
      }

      const updatedMember =
        data.familyMember ||
        data.updatedMember ||
        data.member ||
        data;

      const mergedMember = {
        ...editingMember,
        ...updatedMember,
        ...payload,
        _id: editingMember._id,
        address: {
          ...emptyAddress,
          ...(editingMember.address || {}),
          ...payload.address,
          ...(updatedMember.address || {}),
        },
      };

      setFamilyMembers((previous) =>
        previous.map((member) =>
          member._id === editingMember._id
            ? mergedMember
            : member
        )
      );

      setSelectedMember(mergedMember);
      setFormData(createEmptyFormData());
      setEditingMember(null);
      setShowForm(false);

      alert("Family member updated successfully!");
    } catch (error) {
      console.error("Error updating family member:", error);
      alert("Could not connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setFormData(createEmptyFormData());
    setEditingMember(null);
    setShowForm(false);
  };

  const getInitial = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  // Family Member View Profile
  if (selectedMember && !showForm) {
    return (
      <div className="family-profile-page">
        <main className="family-profile-container">
          <button
            className="family-profile-back"
            onClick={() => setSelectedMember(null)}
          >
            ← Back to Family Members
          </button>

          <div className="family-profile-heading">
            <span className="family-profile-eyebrow">
              FAMILY MANAGEMENT
            </span>
            <h1>Family Member Profile</h1>
            <p>
              View and manage your family member's information.
            </p>
          </div>

          <div className="family-profile-card">
            <div className="family-profile-top">
              <div className="family-profile-avatar">
                {getInitial(selectedMember.name)}
              </div>

              <div className="family-profile-name">
                <span className="family-profile-label">
                  FAMILY MEMBER
                </span>
                <h2>{selectedMember.name}</h2>
                <span className="family-profile-relationship">
                  {selectedMember.relationship}
                </span>
              </div>
            </div>

            <div className="family-profile-divider"></div>

            <div className="family-profile-section-title">
              <h3>Personal Information</h3>
              <p>Member details and basic information</p>
            </div>

            <div className="family-profile-details">
              <div className="family-profile-detail">
                <div className="family-detail-icon">🎂</div>
                <div>
                  <span>Date of Birth</span>
                  <strong>
                    {selectedMember.dateOfBirth
                      ? new Date(
                          selectedMember.dateOfBirth
                        ).toLocaleDateString()
                      : "Not available"}
                  </strong>
                </div>
              </div>

              <div className="family-profile-detail">
                <div className="family-detail-icon">⚧</div>
                <div>
                  <span>Gender</span>
                  <strong>
                    {selectedMember.gender || "Not available"}
                  </strong>
                </div>
              </div>

              <div className="family-profile-detail">
                <div className="family-detail-icon">👨‍👩‍👧</div>
                <div>
                  <span>Relationship</span>
                  <strong>
                    {selectedMember.relationship || "Not available"}
                  </strong>
                </div>
              </div>

              <div className="family-profile-detail">
                <div className="family-detail-icon">📞</div>
                <div>
                  <span>Phone Number</span>
                  <strong>
                    {selectedMember.phoneNumber || "Not available"}
                  </strong>
                </div>
              </div>

              <div className="family-profile-detail">
                <div className="family-detail-icon">📍</div>
                <div>
                  <span>Address</span>
                  <strong>
                    {formatAddress(selectedMember.address)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="family-profile-footer">
              <div>
                <strong>Keep information up to date</strong>
                <p>
                  Update this member's details whenever needed.
                </p>
              </div>

              <button
                type="button"
                className="family-profile-edit"
                onClick={handleEditMember}
              >
                ✎ Edit Profile
              </button>
            </div>
          </div>

          <p className="family-profile-note">
            ImuniX · Family Health Management
          </p>
        </main>
      </div>
    );
  }

  // Edit Family Member Form
  if (showForm && editingMember) {
    return (
      <div className="family-page">
        <main className="family-container">
          <button
            className="family-back"
            onClick={handleCancelForm}
          >
            ← Back to Family Members
          </button>

          <div className="family-heading">
            <h1>Family Account</h1>
            <p>
              Manage vaccination profiles for you and your family.
            </p>
          </div>

          <div className="family-form-card">
            <h3>Edit Family Member</h3>

            <form onSubmit={handleUpdateMember}>
              <div className="family-form-grid">
                <div className="family-form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="family-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="family-form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="family-form-group">
                  <label>Relationship</label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="Child">Child</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="family-form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="family-form-group">
                  <label>Street / House</label>
                  <input
                    type="text"
                    name="street"
                    value={formData.address.street}
                    onChange={handleAddressChange}
                    placeholder="House number, street"
                  />
                </div>

                <div className="family-form-group">
                  <label>Area</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.address.area}
                    onChange={handleAddressChange}
                    placeholder="Enter area"
                  />
                </div>

                <div className="family-form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.address.city}
                    onChange={handleAddressChange}
                    placeholder="Enter city"
                  />
                </div>

                <div className="family-form-group">
                  <label>District</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.address.district}
                    onChange={handleAddressChange}
                    placeholder="Enter district"
                  />
                </div>

                <div className="family-form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.address.postalCode}
                    onChange={handleAddressChange}
                    placeholder="Enter postal code"
                  />
                </div>

                <div className="family-form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.address.country}
                    onChange={handleAddressChange}
                    placeholder="Enter country"
                  />
                </div>
              </div>

              <div className="family-form-actions">
                <button
                  type="button"
                  className="family-cancel-button"
                  onClick={handleCancelForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="family-add-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="family-page">
      <main className="family-container">
        <button className="family-back" onClick={onBack}>
          ← Back to Dashboard
        </button>

        <div className="family-heading">
          <h1>Family Account</h1>
          <p>
            Manage vaccination profiles for you and your family.
          </p>
        </div>

        <section className="family-section">
          <div className="family-section-header">
            <h2>Family Members</h2>

            <button
              className="family-add-button"
              onClick={() => {
                if (showForm) {
                  handleCancelForm();
                } else {
                  setSelectedMember(null);
                  setEditingMember(null);
                  setFormData(createEmptyFormData());
                  setShowForm(true);
                }
              }}
              disabled={saving}
            >
              {showForm ? "Close" : "+ Add Family Member"}
            </button>
          </div>

          {/* Add Family Member form remains unchanged */}
          {showForm && (
            <div className="family-form-card">
              <h3>Add Family Member</h3>

              <form onSubmit={handleAddMember}>
                <div className="family-form-grid">
                  <div className="family-form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="family-form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="family-form-group">
                    <label>Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="family-form-group">
                    <label>Relationship</label>
                    <select
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select relationship</option>
                      <option value="Child">Child</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="family-form-actions">
                  <button
                    type="button"
                    className="family-cancel-button"
                    onClick={handleCancelForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="family-add-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Add Member"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {familyMembers.length > 0 ? (
            <div className="family-members-grid">
              {familyMembers.map((member) => (
                <div className="family-member-card" key={member._id}>
                  <div className="family-member-top">
                    <div className="family-avatar">
                      {getInitial(member.name)}
                    </div>

                    <div className="family-member-info">
                      <h3>{member.name}</h3>
                      <p>{member.relationship}</p>
                    </div>
                  </div>

                  <button
                    className="family-view-button"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowForm(false);
                      setEditingMember(null);
                    }}
                  >
                    View Profile →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !showForm && (
              <div className="family-empty">
                <h3>No family members yet</h3>
                <p>
                  Add a family member to manage their vaccination
                  profile.
                </p>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
};

export default FamilyAccount;