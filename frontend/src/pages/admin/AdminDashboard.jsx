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

function AdminDashboard({ onAddClinic }) {
  return (
    <div className="dashboard">

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">

        <div className="sidebar-top">

          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">+</div>

            <div>
              <span>ImuniX</span>
              <small>Vaccination System</small>
            </div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">

            <p className="nav-label">MAIN MENU</p>

            <a href="#" className="nav-item active">
              <span>📊</span>
              Dashboard
            </a>

            <a href="#" className="nav-item">
              <span>🏥</span>
              Clinics
            </a>

            <a href="#" className="nav-item">
              <span>👥</span>
              Citizens
            </a>

            <a href="#" className="nav-item">
              <span>💉</span>
              Vaccinations
            </a>

            <a href="#" className="nav-item">
              <span>📅</span>
              Appointments
            </a>

            <p className="nav-label settings-label">SYSTEM</p>

            <a href="#" className="nav-item">
              <span>📈</span>
              Reports
            </a>

            <a href="#" className="nav-item">
              <span>⚙️</span>
              Settings
            </a>

          </nav>

        </div>

        {/* Logout */}
        <button className="logout">
          <span>↪</span>
          Logout
        </button>

      </aside>


      {/* ================= MAIN CONTENT ================= */}
      <main className="main-content">

        {/* Header */}
        <header className="top-header">

          <div>
            <p className="breadcrumb">Dashboard</p>

            <h1>Admin Dashboard</h1>

            <p className="header-description">
              Welcome back! Here's what's happening with your vaccination system.
            </p>
          </div>

          <div className="header-right">

            {/* Notification */}
            <button className="notification-btn">
              🔔
              <span className="notification-dot"></span>
            </button>

            {/* Profile */}
            <div className="admin-profile">

              <div className="profile-avatar">
                A
              </div>

              <div className="profile-info">
                <strong>Admin</strong>
                <small>Administrator</small>
              </div>

              <span className="profile-arrow">⌄</span>

            </div>

          </div>

        </header>


        {/* ================= STATISTICS ================= */}
        <section className="stats">

          <div className="stat-card">

            <div className="stat-icon blue">
              🏥
            </div>

            <div className="stat-content">
              <p>Total Clinics</p>
              <h2>4</h2>
              <span className="stat-note">Registered clinics</span>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div className="stat-content">
              <p>Active Clinics</p>
              <h2>3</h2>
              <span className="stat-note positive">
                ● 75% active
              </span>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon purple">
              👥
            </div>

            <div className="stat-content">
              <p>Total Citizens</p>
              <h2>0</h2>
              <span className="stat-note">Registered citizens</span>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon cyan">
              💉
            </div>

            <div className="stat-content">
              <p>Vaccinations</p>
              <h2>0</h2>
              <span className="stat-note">Total vaccinations</span>
            </div>

          </div>

        </section>


        {/* ================= QUICK ACTIONS ================= */}
        <section className="quick-section">

          <div className="section-title">
            <div>
              <h2>Quick Actions</h2>
              <p>Frequently used administration tools</p>
            </div>
          </div>

          <div className="quick-actions">

            {/* ADD CLINIC */}
            <button
              className="quick-card"
              onClick={onAddClinic}
            >
              <div className="quick-icon blue-bg">
                +
              </div>

              <div>
                <strong>Add New Clinic</strong>
                <span>Register a vaccination clinic</span>
              </div>

              <span className="quick-arrow">→</span>
            </button>


            <button className="quick-card">
              <div className="quick-icon purple-bg">
                👥
              </div>

              <div>
                <strong>Manage Citizens</strong>
                <span>View registered citizens</span>
              </div>

              <span className="quick-arrow">→</span>
            </button>


            <button className="quick-card">
              <div className="quick-icon cyan-bg">
                💉
              </div>

              <div>
                <strong>Manage Vaccines</strong>
                <span>Manage vaccine information</span>
              </div>

              <span className="quick-arrow">→</span>
            </button>

          </div>

        </section>


        {/* ================= CLINICS ================= */}
        <section className="clinic-section">

          <div className="section-header">

            <div>
              <p className="section-label">CLINIC MANAGEMENT</p>

              <h2>All Clinics</h2>

              <p>
                Manage registered vaccination clinics
              </p>
            </div>

            {/* ADD CLINIC */}
            <button
              className="add-btn"
              onClick={onAddClinic}
            >
              <span>+</span>
              Add New Clinic
            </button>

          </div>


          {/* Search */}
          <div className="table-toolbar">

            <div className="search-box">
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search clinics..."
              />
            </div>

            <button className="filter-btn">
              Filter ▾
            </button>

          </div>


          {/* Table */}
          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Clinic</th>
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

                        <div>
                          <strong>{clinic.name}</strong>
                          <small>Vaccination Center</small>
                        </div>

                      </div>

                    </td>

                    <td>
                      <span className="location">
                        📍 {clinic.location}
                      </span>
                    </td>

                    <td>
                      {clinic.contact}
                    </td>

                    <td>

                      <span
                        className={
                          clinic.status === "Active"
                            ? "status active-status"
                            : "status inactive-status"
                        }
                      >
                        <span className="status-dot"></span>
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


          {/* Table Footer */}
          <div className="table-footer">

            <span>
              Showing <strong>4</strong> of <strong>4</strong> clinics
            </span>

            <div className="pagination">

              <button disabled>‹</button>
              <button className="page-active">1</button>
              <button disabled>›</button>

            </div>

          </div>

        </section>


        {/* ================= SYSTEM STATUS ================= */}
        <section className="system-status">

          <div>
            <div className="system-icon">✓</div>

            <div>
              <strong>System Status</strong>
              <p>All ImuniX services are currently operational.</p>
            </div>
          </div>

          <span className="online-status">
            ● All Systems Operational
          </span>

        </section>

      </main>

    </div>
  );
}

export default AdminDashboard;