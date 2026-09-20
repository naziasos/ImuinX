import React from "react";

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
    <div>
      <h1>ImuniX Admin Dashboard</h1>

      <h2>All Clinics</h2>

      <button>+ Add New Clinic</button>

      <table>
        <thead>
          <tr>
            <th>Clinic Name</th>
            <th>Location</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {clinics.map((clinic, index) => (
            <tr key={index}>
              <td>{clinic.name}</td>
              <td>{clinic.location}</td>
              <td>{clinic.contact}</td>
              <td>{clinic.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;