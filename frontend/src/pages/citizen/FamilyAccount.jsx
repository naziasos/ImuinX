import React, { useEffect, useState } from "react";
import "./FamilyAccount.css";

const FamilyAccount = ({ onLogout, onBack }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showForm, setShowForm] = useState(false);

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

  const handleAddMember = async (e) => {
    e.preventDefault();

    try {
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
        setFamilyMembers([...familyMembers, data]);

        setFormData({
          name: "",
          dateOfBirth: "",
          gender: "",
          relationship: "",
        });

        setShowForm(false);
      } else {
        alert(data.message || "Failed to add family member.");
      }
    } catch (error) {
      console.error("Error adding family member:", error);
      alert("Something went wrong.");
    }
  };

  const getInitial = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

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
                setShowForm(!showForm);
                setSelectedMember(null);
              }}
            >
              {showForm ? "Close" : "+ Add Family Member"}
            </button>
          </div>

          {/* Add Member Form */}
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
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="family-add-button"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Family Members */}
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

        {/* Selected Member */}
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
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default FamilyAccount;