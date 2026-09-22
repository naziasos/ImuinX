import { useState } from "react";
import "./AddClinic.css";

function AddClinic({ onBack, onClinicCreated }) {
  const [formData, setFormData] = useState({
    clinicName: "",
    location: "",
    contact: "",
    adminName: "",
    adminEmail: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/clinics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create clinic");
        setLoading(false);
        return;
      }

      setMessage(
        "Clinic created successfully. Login credentials have been sent to the Clinic Admin's email."
      );

      setFormData({
        clinicName: "",
        location: "",
        contact: "",
        adminName: "",
        adminEmail: "",
      });

      if (onClinicCreated) {
        onClinicCreated(data.clinic);
      }
    } catch (error) {
      setMessage("Could not connect to server");
    }

    setLoading(false);
  };

  return (
    <div className="add-clinic-page">

      <div className="add-clinic-card">

        {/* LEFT SIDE */}
        <section className="clinic-intro">

          <div className="intro-icon">
            🏥
          </div>

          <h1>Add New Clinic</h1>

          <p>
            Create a clinic and assign a Clinic Admin to manage its
            operations.
          </p>

          {/* CSS Clinic Illustration */}
          <div className="clinic-illustration">

            <div className="clinic-circle">
              <div className="clinic-building">

                <div className="building-main">
                  <div className="clinic-sign">
                    <span>+</span>
                  </div>

                  <div className="building-window window-one"></div>
                  <div className="building-window window-two"></div>

                  <div className="clinic-door">
                    <span>+</span>
                  </div>
                </div>

                <div className="building-roof"></div>

              </div>

              <div className="tree tree-left">
                <span></span>
              </div>

              <div className="tree tree-right">
                <span></span>
              </div>

              <div className="clinic-plus-badge">
                +
              </div>
            </div>

          </div>

        </section>


        {/* RIGHT SIDE */}
        <section className="clinic-form-section">

          <div className="form-header">
            <h2>Create Clinic</h2>

            <p>
              Fill in the details below to add a new clinic and create a
              Clinic Admin account.
            </p>
          </div>


          <form onSubmit={handleSubmit}>

            {/* CLINIC INFORMATION */}
            <div className="form-section-title">
              <div className="section-icon">
                🏥
              </div>

              <div>
                <h3>Clinic Information</h3>
              </div>
            </div>


            <div className="form-grid">

              <div className="input-group">
                <label>Clinic Name</label>

                <div className="input-wrapper">
                  <span>▣</span>

                  <input
                    type="text"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleChange}
                    placeholder="Clinic Name"
                    required
                  />
                </div>
              </div>


              <div className="input-group">
                <label>Contact Number</label>

                <div className="input-wrapper">
                  <span>☎</span>

                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Contact Number"
                    required
                  />
                </div>
              </div>

            </div>


            <div className="input-group full-input">
              <label>Location</label>

              <div className="input-wrapper">
                <span>⌖</span>

                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Clinic Location"
                  required
                />
              </div>
            </div>


            {/* CLINIC ADMIN */}
            <div className="form-section-title admin-title">

              <div className="section-icon">
                👤
              </div>

              <div>
                <h3>Clinic Admin</h3>
              </div>

            </div>


            <div className="form-grid">

              <div className="input-group">
                <label>Admin Name</label>

                <div className="input-wrapper">
                  <span>♙</span>

                  <input
                    type="text"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="Admin Name"
                    required
                  />
                </div>
              </div>


              <div className="input-group">
                <label>Admin Email</label>

                <div className="input-wrapper">
                  <span>✉</span>

                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="Admin Email"
                    required
                  />
                </div>
              </div>

            </div>


            {/* PASSWORD INFORMATION */}
            <div className="password-info">
              <div className="info-icon">i</div>

              <p>
                A temporary password will be generated automatically and
                sent to the Clinic Admin's email.
              </p>
            </div>


            {/* MESSAGE */}
            {message && (
              <div className="form-message">
                {message}
              </div>
            )}


            {/* BUTTON */}
            <button
              type="submit"
              className="create-clinic-button"
              disabled={loading}
            >
              <span>+</span>

              {loading ? "Creating..." : "Create Clinic"}
            </button>


            {/* BACK */}
            <button
              type="button"
              className="back-button"
              onClick={onBack}
            >
              ← Back to Dashboard
            </button>

          </form>

        </section>

      </div>

    </div>
  );
}

export default AddClinic;