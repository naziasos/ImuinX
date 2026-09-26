
import React, { useEffect, useState } from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";

import Card from "../../components/Card";
import Button from "../../components/Button";

function FamilyAccount({ onBack, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

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

        const response = await fetch("http://localhost:5000/api/family", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setFamilyMembers(data.familyMembers);
        }
      } catch (error) {
        console.error("Failed to load family members:", error);
      }
    };

    fetchFamilyMembers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddFamilyMember = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/family", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setFamilyMembers((prevMembers) => [
          data.familyMember,
          ...prevMembers,
        ]);

        setFormData({
          name: "",
          dateOfBirth: "",
          gender: "",
          relationship: "",
        });

        setShowForm(false);
      } else {
        console.error(data.message);
        alert(data.message || "Failed to add family member");
      }
    } catch (error) {
      console.error("Add family member error:", error);
      alert("Something went wrong while adding the family member.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="clinic-dashboard">

      {/* Sidebar */}
      <aside className="clinic-sidebar">

        <div>
          {/* Logo */}
          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="clinic-nav">

            <p className="clinic-nav-title">
              MAIN MENU
            </p>

            <button
              className="clinic-nav-item"
              onClick={onBack}
            >
              <span>📊</span>
              Dashboard
            </button>

            <button className="clinic-nav-item">
              <span>💉</span>
              My Vaccinations
            </button>

            <button className="clinic-nav-item">
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item">
              <span>🪪</span>
              Vaccine Certificate
            </button>

            <button className="clinic-nav-item active">
              <span>👨‍👩‍👧</span>
              Family Account
            </button>

            <p className="clinic-nav-title system-title">
              SYSTEM
            </p>

            <button className="clinic-nav-item">
              <span>⚙️</span>
              Settings
            </button>

          </nav>
        </div>

        {/* Logout */}
        <button
          className="clinic-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>

      {/* Main Content */}
      <main className="clinic-main">

        {/* Header */}
        <header className="clinic-header">

          <div>
            <p className="clinic-breadcrumb">
              Dashboard / Family Account
            </p>

            <h1>
              Family Account
            </h1>

            <p className="clinic-description">
              Manage vaccination profiles for your family members.
            </p>
          </div>

          <div className="clinic-profile">

            <div className="clinic-profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "C"}
            </div>

            <div>
              <strong>{user?.name || "Citizen"}</strong>
              <span>Citizen</span>
            </div>

          </div>

        </header>

        {/* Family Members */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                FAMILY MEMBERS
              </p>

              <h2>
                My Family
              </h2>

              <p>
                Add and manage vaccination profiles for your family members.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              + Add Family Member
            </Button>

          </div>

          {/* Add Family Member Form */}
          {showForm ? (
            <Card
              title="Add Family Member"
              subtitle="Enter the family member's information below."
              className="mb-6"
            >
              <form
                onSubmit={handleAddFamilyMember}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gender
                  </label>

                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      Select gender
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Relationship
                  </label>

                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      Select relationship
                    </option>

                    <option value="Child">
                      Child
                    </option>

                    <option value="Spouse">
                      Spouse
                    </option>

                    <option value="Parent">
                      Parent
                    </option>

                    <option value="Sibling">
                      Sibling
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2 flex gap-3">

                  <Button
                    type="submit"
                    variant="primary"
                  >
                    Add Family Member
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>

                </div>

              </form>
            </Card>
          ) : null}

          {/* Family Members Display */}
          {!showForm && familyMembers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {familyMembers.map((member) => (
                <Card
                  key={member._id}
                  className="h-full"
                >

                  <div className="flex items-center gap-4 mb-5">

                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                      👤
                    </div>

                    <div>

                      <h3 className="text-lg font-bold text-slate-800">
                        {member.name}
                      </h3>

                      <p className="text-sm text-blue-600 font-medium">
                        {member.relationship}
                      </p>

                    </div>

                  </div>

                  <div className="space-y-3">

                    <div className="flex justify-between items-center">

                      <span className="text-sm text-slate-500">
                        Date of Birth
                      </span>

                      <span className="text-sm font-semibold text-slate-700">
                        {new Date(member.dateOfBirth).toLocaleDateString()}
                      </span>

                    </div>

                    <div className="flex justify-between items-center">

                      <span className="text-sm text-slate-500">
                        Gender
                      </span>

                      <span className="text-sm font-semibold text-slate-700">
                        {member.gender}
                      </span>

                    </div>

                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedMember(member)}
                    >
                      View Profile
                    </Button>

                  </div>

                </Card>
              ))}

            </div>
          )}

          {/* Selected Family Member Profile */}
          {selectedMember && (
            <Card className="mt-6">

              <div className="flex items-center justify-between mb-6">

                <div>

                  <p className="section-label">
                    SELECTED PROFILE
                  </p>

                  <h2 className="text-2xl font-bold text-slate-800">
                    {selectedMember.name}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {selectedMember.relationship}
                  </p>

                </div>

                <Button
                  variant="secondary"
                  onClick={() => setSelectedMember(null)}
                >
                  Back to Family
                </Button>

              </div>

              {/* Member Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="p-4 bg-slate-50 rounded-xl">

                  <p className="text-sm text-slate-500">
                    Date of Birth
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {new Date(
                      selectedMember.dateOfBirth
                    ).toLocaleDateString()}
                  </p>

                </div>

                <div className="p-4 bg-slate-50 rounded-xl">

                  <p className="text-sm text-slate-500">
                    Gender
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedMember.gender}
                  </p>

                </div>

                <div className="p-4 bg-slate-50 rounded-xl">

                  <p className="text-sm text-slate-500">
                    Relationship
                  </p>

                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedMember.relationship}
                  </p>

                </div>

              </div>

              {/* Appointments */}
              <div className="mt-6">

                <h3 className="text-lg font-bold text-slate-800">
                  Appointments
                </h3>

                <div className="mt-3 p-5 bg-slate-50 rounded-xl">

                  <p className="text-sm text-slate-500">
                    No appointments available for this family member.
                  </p>

                </div>

              </div>

              {/* Vaccination Records */}
              <div className="mt-6">

                <h3 className="text-lg font-bold text-slate-800">
                  Vaccination Records
                </h3>

                <div className="mt-3 p-5 bg-slate-50 rounded-xl">

                  <p className="text-sm text-slate-500">
                    No vaccination records available for this family member.
                  </p>

                </div>

              </div>

            </Card>
          )}

          {/* Empty State */}
          {!showForm && familyMembers.length === 0 && (
            <Card className="text-center">

              <div className="flex justify-center mb-4">

                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl">
                  👨‍👩‍👧
                </div>

              </div>

              <h3 className="text-lg font-bold text-slate-800">
                No family members added
              </h3>

              <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
                Add a family member to manage their vaccination information
                from your account.
              </p>

              <div className="mt-5 flex justify-center">

                <Button
                  variant="primary"
                  onClick={() => setShowForm(true)}
                >
                  + Add Family Member
                </Button>

              </div>

            </Card>
          )}

        </section>

      </main>

    </div>
  );
}

export default FamilyAccount;

