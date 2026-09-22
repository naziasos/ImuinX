
import React from "react";
import "./AdminDashboard.css";

const clinics = [
  {
    name: "Dhanmondi Vaccination Center",
    location: "Dhanmondi, Dhaka",
    contact: "01711-123456",
    status: "Active",
  },
  {
    name: "Uttara Health Clinic",
    location: "Uttara, Dhaka",
    contact: "01822-456789",
    status: "Active",
  },
  {
    name: "Mirpur Community Clinic",
    location: "Mirpur, Dhaka",
    contact: "01933-987654",
    status: "Active",
  },
  {
    name: "Gulshan Medical Center",
    location: "Gulshan, Dhaka",
    contact: "01644-555555",
    status: "Inactive",
  },
];

function AdminDashboard() {
  return (
    <div className="dashboard">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">+</div>
          <span>ImuniX</span>
        </div>

        <nav>
          <a href="#" className="nav-item active">
            📊 Dashboard
          </a>

          <a href="#" className="nav-item">
            🏥 Clinics
          </a>

          <a href="#" className="nav-item">
            👥 Users
          </a>

          <a href="#" className="nav-item">
            💉 Vaccines
          </a>
        </nav>

        <button className="logout">
          ↪ Logout
        </button>

      </aside>


      {/* Main Content */}
      <main className="main-content">

        {/* Header */}
        <div className="top-header">

          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage your ImuniX vaccination system</p>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">
              A
            </div>

            <div>
              <strong>Admin</strong>
              <small>Administrator</small>
            </div>
          </div>

        </div>


        {/* Statistics */}
        <div className="stats">

          <div className="stat-card">
            <div className="stat-icon blue">
              🏥
            </div>

            <div>
              <p>Total Clinics</p>
              <h2>4</h2>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon green">
              ✓
            </div>

            <div>
              <p>Active Clinics</p>
              <h2>3</h2>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon purple">
              👥
            </div>

            <div>
              <p>Total Citizens</p>
              <h2>0</h2>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon cyan">
              💉
            </div>

            <div>
              <p>Vaccinations</p>
              <h2>0</h2>
            </div>
          </div>

        </div>


        {/* Clinic Section */}
        <section className="clinic-section">

          <div className="section-header">

            <div>
              <h2>All Clinics</h2>
              <p>Manage registered vaccination clinics</p>
            </div>

            <button className="add-btn">
              + Add New Clinic
            </button>

          </div>


          {/* Table */}
          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {clinics.map((clinic, index) => (

                  <tr key={index}>

                    <td>
                      <div className="clinic-name">

                        <div className="clinic-icon">
                          🏥
                        </div>

                        {clinic.name}

                      </div>
                    </td>

                    <td>{clinic.location}</td>

                    <td>{clinic.contact}</td>

                    <td>
                      <span
                        className={
                          clinic.status === "Active"
                            ? "status active-status"
                            : "status inactive-status"
                        }
                      >
                        {clinic.status}
                      </span>
                    </td>

                    <td>
                      <button className="view-btn">
                        View
                      </button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

export default AdminDashboard;
