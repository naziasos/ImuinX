import React, { useEffect, useState } from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";

function BookAppointment({ onBack, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [clinic, setClinic] = useState("");
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const [clinics, setClinics] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
const [appointmentLoading, setAppointmentLoading] = useState(true);
  useEffect(() => {
  fetch("http://localhost:5000/api/clinics")
    .then((response) => response.json())
    .then((data) => {
      setClinics(data.clinics || []);
    })
    .catch((error) => {
      console.error("Error fetching clinics:", error);
    });
}, []);
useEffect(() => {
  const citizenId = user?.id || user?._id;

  if (!citizenId) {
    setAppointmentLoading(false);
    return;
  }

  fetch(
    `http://localhost:5000/api/appointments/citizen/${citizenId}`
  )
    .then((response) => response.json())
    .then((data) => {
      setMyAppointments(data.appointments || []);
      setAppointmentLoading(false);
    })
    .catch((error) => {
      console.error("Error fetching appointments:", error);
      setAppointmentLoading(false);
    });
}, [user?.id, user?._id]);

 const [timeSlots, setTimeSlots] = useState([]);
 useEffect(() => {
  if (!clinic || !date) {
    return;
  }

  fetch(
    `http://localhost:5000/api/appointments/slots?clinicId=${clinic}&date=${date}`
  )
    .then((response) => response.json())
    .then((data) => {
      const formattedSlots = (data.availableSlots || []).map(
        (time, index) => ({
          id: index + 1,
          time: time,
          available: true,
        })
      );

      setTimeSlots(formattedSlots);
    })
    .catch((error) => {
      console.error("Error fetching available slots:", error);
      setTimeSlots([]);
    });
}, [clinic, date]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };

  const handleConfirm = async () => {
  if (!clinic || !date || !selectedSlot) {
    alert("Please select clinic, date and time slot.");
    return;
  }

  const citizenId = user?.id || user?._id;

  if (!citizenId) {
    alert("User information not found. Please login again.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          citizenId: citizenId,
          clinicId: clinic,
          date: date,
          time: selectedSlot,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to book appointment.");
      return;
    }

    const selectedClinic = clinics.find(
      (item) => item._id === clinic
    );

    alert(
      `Appointment Booked Successfully!\n\n` +
      `Clinic: ${selectedClinic?.name || "Selected Clinic"}\n` +
      `Date: ${date}\n` +
      `Time: ${selectedSlot}\n\n` +
      `Appointment ID: ${data.appointmentId}\n` +
      `Status: ${data.status}`
    );

  } catch (error) {
    console.error("Booking error:", error);
    alert("Something went wrong while booking the appointment.");
  }
};
  return (
    <div className="clinic-dashboard">

      {/* Sidebar */}
      <aside className="clinic-sidebar">

        <div>

          <div className="clinic-logo">
            <div className="clinic-logo-icon">
              +
            </div>

            <div>
              <strong>ImuniX</strong>
              <span>Vaccination System</span>
            </div>
          </div>

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

            <button className="clinic-nav-item active">
              <span>📅</span>
              Appointments
            </button>

            <button className="clinic-nav-item">
              <span>🪪</span>
              Vaccine Certificate
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
              Dashboard / Appointments
            </p>

            <h1>
              Book Appointment
            </h1>

            <p className="clinic-description">
              Select a clinic, date and available time slot for your vaccination.
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

        {/* Appointment Form */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                APPOINTMENT BOOKING
              </p>

              <h2>
                Select Clinic & Time
              </h2>

              <p>
                Choose your preferred clinic, date and available time slot.
              </p>
            </div>

          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">

            {/* Clinic */}
            <div className="mb-6">

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Clinic
              </label>

              <select
                value={clinic}
                onChange={(e) => {
                setClinic(e.target.value);
                setSelectedSlot("");
                setTimeSlots([]);
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  Select a clinic
                </option>

                {clinics.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} - {item.location}
                  </option>
                ))}

              </select>

            </div>

            {/* Date */}
            <div className="mb-6">

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Date
              </label>

              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
  setDate(e.target.value);
  setSelectedSlot("");
  setTimeSlots([]);
}}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* Time Slots */}
            {clinic && date && (
              <div className="mb-6">

                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Available Time Slots
                </label>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  {timeSlots.map((slot) => {

                    const isSelected =
                      selectedSlot === slot.time;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => {
                          if (slot.available) {
                            setSelectedSlot(slot.time);
                          }
                        }}
                        className={`px-4 py-3 rounded-xl border font-medium transition
                          ${
                            !slot.available
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-200 hover:border-blue-500 hover:text-blue-600"
                          }
                        `}
                      >
                        {slot.time}

                        {!slot.available && (
                          <span className="block text-xs mt-1">
                            Unavailable
                          </span>
                        )}
                      </button>
                    );
                  })}

                </div>

              </div>
            )}

            {/* Selected Appointment */}
            {selectedSlot && clinic && date && (

              <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-100">

                <p className="text-sm font-semibold text-blue-600 mb-3">
                  SELECTED APPOINTMENT
                </p>

                <div className="space-y-2">

                  <p className="text-slate-700">
                    <strong>Clinic:</strong>{" "}
                    {
                      clinics.find(
                        (item) => item._id === clinic
                      )?.name
                    }
                  </p>

                  <p className="text-slate-700">
                    <strong>Date:</strong>{" "}
                    {date}
                  </p>

                  <p className="text-slate-700">
                    <strong>Time:</strong>{" "}
                    {selectedSlot}
                  </p>

                </div>

              </div>

            )}

            {/* Confirm */}
            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!clinic || !date || !selectedSlot}
                className={`px-6 py-3 rounded-xl font-semibold transition
                  ${
                    !clinic || !date || !selectedSlot
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }
                `}
              >
                Confirm Appointment
              </button>

              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

            </div>

          </div>

        </section>
                {/* My Appointments */}
        <section className="workers-section">

          <div className="workers-header">

            <div>
              <p className="section-label">
                MY APPOINTMENTS
              </p>

              <h2>
                Appointment Status
              </h2>

              <p>
                Check the status of your vaccination appointments.
              </p>
            </div>

            <div className="worker-count">
              {myAppointments.length} Appointment
              {myAppointments.length !== 1 ? "s" : ""}
            </div>

          </div>

          {appointmentLoading ? (

            <div className="empty-workers">
              <p>Loading appointments...</p>
            </div>

          ) : myAppointments.length === 0 ? (

            <div className="empty-workers">

              <div className="empty-icon">
                📅
              </div>

              <h3>
                No appointments yet
              </h3>

              <p>
                Your booked appointments will appear here.
              </p>

            </div>

          ) : (

            <div className="workers-grid">

              {myAppointments.map((appointment) => (

                <div
                  className="worker-card"
                  key={appointment._id}
                >

                  <div className="worker-avatar">
                    📅
                  </div>

                  <div className="worker-info">

                    <h3>
                      {appointment.clinicId?.name || "Unknown Clinic"}
                    </h3>

                    <p>
                      {appointment.clinicId?.location || "Location unavailable"}
                    </p>

                    <span className="worker-role">
                      {new Date(
                        appointment.dateTime
                      ).toLocaleDateString()}
                      {" • "}
                      {new Date(
                        appointment.dateTime
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                  </div>

                  <span
                    className={`worker-role ${
                      appointment.status === "Confirmed"
                        ? "status-confirmed"
                        : appointment.status === "Cancelled"
                        ? "status-cancelled"
                        : "status-pending"
                    }`}
                  >
                    {appointment.status}
                  </span>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default BookAppointment;