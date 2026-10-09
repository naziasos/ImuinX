import React, { useEffect, useState } from "react";
import "./FamilyAccount.css";

const FamilyAccount = ({ onLogout, onBack }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    gender: "",
    relationship: "",
  });

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Add Family Member
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

        setFormData({
          name: "",
          dateOfBirth: "",
          gender: "",
          relationship: "",
        });

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
        ? new Date(selectedMember.dateOfBirth)
            .toISOString()
            .slice(0, 10)
        : "",
      gender: selectedMember.gender || "",
      relationship: selectedMember.relationship || "",
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

      const response = await fetch(
        `http://localhost:5000/api/family/${editingMember._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const updatedMember =
          data.familyMember ||
          data.updatedMember ||
          data;

        setFamilyMembers((previous) =>
          previous.map((member) =>
            member._id === editingMember._id
              ? { ...member, ...updatedMember }
              : member
          )
        );

        setSelectedMember({
          ...editingMember,
          ...updatedMember,
        });

        setFormData({
          name: "",
          dateOfBirth: "",
          gender: "",
          relationship: "",
        });

        setEditingMember(null);
        setShowForm(false);

        alert("Family member updated successfully!");
      } else {
        alert(
          data.message || "Failed to update family member."
        );
      }
    } catch (error) {
      console.error("Error updating family member:", error);
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setFormData({
      name: "",
      dateOfBirth: "",
      gender: "",
      relationship: "",
    });

    setEditingMember(null);
    setShowForm(false);
  };

  const getInitial = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };



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

        {/* Back to Dashboard */}
        <button
          className="family-back"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        {/* Page Heading */}
        <div className="family-heading">
          <h1>Family Account</h1>
          <p>
            Manage vaccination profiles for you and your family.
          </p>
        </div>

        {/* Family Members */}
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

                  setFormData({
                    name: "",
                    dateOfBirth: "",
                    gender: "",
                    relationship: "",
                  });

                  setShowForm(true);
                }
              }}
              disabled={saving}
            >
              {showForm ? "Close" : "+ Add Family Member"}
            </button>
          </div>

          {/* Add / Edit Form */}
          {showForm && (
            <div className="family-form-card">
              <h3>
                {editingMember
                  ? "Edit Family Member"
                  : "Add Family Member"}
              </h3>

              <form
                onSubmit={
                  editingMember
                    ? handleUpdateMember
                    : handleAddMember
                }
              >
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
                      <option value="">
                        Select relationship
                      </option>
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
                    {saving
                      ? "Saving..."
                      : editingMember
                        ? "Save Changes"
                        : "Add Member"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Family Members List */}
          {familyMembers.length > 0 ? (
            <div className="family-members-grid">
              {familyMembers.map((member) => (
                <div
                  className="family-member-card"
                  key={member._id}
                >
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

        {/* Selected Member Profile */}
        {selectedMember && (
          <section className="family-section">
            <div className="family-section-header">
              <h2>Profile Details</h2>

              <button
                className="family-close-button"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </button>
            </div>

            <div className="family-profile-card">
              <div className="family-profile-header">
                <div className="family-avatar">
                  {getInitial(selectedMember.name)}
                </div>

                <div className="family-member-info">
                  <h3>{selectedMember.name}</h3>
                  <p>{selectedMember.relationship}</p>
                </div>
              </div>

              <div className="family-profile-details">

                <div className="family-detail">
                  <span>Date of Birth</span>
                  <strong>
                    {selectedMember.dateOfBirth
                      ? new Date(
                          selectedMember.dateOfBirth
                        ).toLocaleDateString()
                      : "Not available"}
                  </strong>
                </div>

                <div className="family-detail">
                  <span>Gender</span>
                  <strong>
                    {selectedMember.gender || "Not available"}
                  </strong>
                </div>

                <div className="family-detail">
                  <span>Relationship</span>
                  <strong>
                    {selectedMember.relationship ||
                      "Not available"}
                  </strong>
                </div>

              </div>

              {/* Edit Profile Button */}
              <div className="family-profile-actions">
                <button
                  type="button"
                  className="family-add-button"
                  onClick={handleEditMember}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default FamilyAccount;