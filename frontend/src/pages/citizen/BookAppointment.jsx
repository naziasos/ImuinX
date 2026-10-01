import React, { useEffect, useState } from "react";
import "../clinicAdmin/ClinicAdminDashboard.css";

function BookAppointment({ onBack }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // =========================
  // States
  // =========================
  const [clinic, setClinic] = useState("");
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const [clinics, setClinics] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [myAppointments, setMyAppointments] = useState([]);
  const [appointmentLoading, setAppointmentLoading] = useState(true);

  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState("self");

  // =========================
  // Get Citizen ID & Token
  // =========================
  const citizenId = user?.id || user?._id;
  const token = localStorage.getItem("token");

  // =========================
  // Fetch Clinics
  // =========================
  useEffect(() => {
    fetch("http://localhost:5000/api/clinics", {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setClinics(data.clinics || []);
      })
      .catch((error) => {
        console.error("Error fetching clinics:", error);
      });
  }, [token]);

  // =========================
  // Fetch My Appointments
  // =========================
  useEffect(() => {
    if (!citizenId) {
      setAppointmentLoading(false);
      return;
    }

    fetch(`http://localhost:5000/api/appointments/citizen/${citizenId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setMyAppointments(data.appointments || []);
        setAppointmentLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching appointments:", error);
        setAppointmentLoading(false);
      });
  }, [citizenId, token]);

  // =========================
  // Fetch Family Members
  // =========================
  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("http://localhost:5000/api/family", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setFamilyMembers(data.familyMembers || []);
      })
      .catch((error) => {
        console.error("Error fetching family members:", error);
        setFamilyMembers([]);
      });
  }, [token]);

  // =========================
  // Fetch Available Time Slots
  // =========================
  useEffect(() => {
    if (!clinic || !date) {
      setTimeSlots([]);
      return;
    }

    fetch(
      `http://localhost:5000/api/appointments/slots?clinicId=${clinic}&date=${date}`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
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
  }, [clinic, date, token]);

  // =========================
  // Book Appointment
  // =========================
  const handleConfirm = async () => {
    if (!clinic || !date || !selectedSlot) {
      alert("Please select clinic, date and time slot.");
      return;
    }

    if (!citizenId) {
      alert("User information not found. Please login again.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          citizenId: citizenId,
          familyProfileId: selectedPerson === "self" ? null : selectedPerson,
          clinicId: clinic,
          date: date,
          time: selectedSlot,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to book appointment.");
        return;
      }

      const selectedClinic = clinics.find((item) => item._id === clinic);

      alert(
        `Appointment Booked Successfully!\n\n` +
          `Clinic: ${selectedClinic?.name || "Selected Clinic"}\n` +
          `Date: ${date}\n` +
          `Time: ${selectedSlot}\n\n` +
          `Appointment ID: ${data.appointmentId || "N/A"}\n` +
          `Status: ${data.status || "Confirmed"}`
      );

      // Refresh appointment list
      const refreshResponse = await fetch(
        `http://localhost:5000/api/appointments/citizen/${citizenId}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const refreshData = await refreshResponse.json();
      setMyAppointments(refreshData.appointments || []);

      // Reset booking form
      setClinic("");
      setDate("");
      setSelectedSlot("");
      setSelectedPerson("self");
      setTimeSlots([]);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Something went wrong while booking the appointment.");
    }
  };

  // =========================
  // Cancel Appointment
  // =========================
  const handleCancelAppointment = async (appointmentId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmCancel) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/appointments/${appointmentId}/cancel`,
        {
          method: "PATCH",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to cancel appointment.");
        return;
      }

      alert("Appointment cancelled successfully.");

      // Update appointment list
      setMyAppointments((previousAppointments) =>
        previousAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? {
                ...appointment,
                status: "Cancelled",
              }
            : appointment
        )
      );
    } catch (error) {
      console.error("Cancel appointment error:", error);
      alert("Something went wrong while cancelling the appointment.");
    }
  };

  // =========================
  // Separate Upcoming / Past
  // =========================
  const now = new Date();

  const upcomingAppointments = myAppointments.filter(
    (appointment) =>
      new Date(appointment.dateTime) >= now &&
      appointment.status !== "Cancelled"
  );

  const pastAppointments = myAppointments.filter(
    (appointment) =>
      new Date(appointment.dateTime) < now ||
      appointment.status === "Cancelled"
  );

  // =========================
  // Render
  // =========================
  return (
    <div className="clinic-dashboard" style={{ display: "block", padding: "20px" }}>
      {/* Main Content (Full Width) */}
      <main className="clinic-main" style={{ marginLeft: 0, width: "100%" }}>
        {/* Back Button Navigation Header */}
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              color: "#334155",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <header className="clinic-header">
          <div>
            <p className="clinic-breadcrumb">Dashboard / Appointments</p>
            <h1>Book Appointment</h1>
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

        {/* Appointment Booking */}
        <section className="workers-section">
          <div className="workers-header">
            <div>
              <p className="section-label">APPOINTMENT BOOKING</p>
              <h2>Select Clinic & Time</h2>
              <p>Choose your preferred clinic, date and available time slot.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {/* Appointment For */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Appointment For
              </label>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="self">
                  Myself ({user?.name || "Citizen"})
                </option>
                {familyMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.relationship})
                  </option>
                ))}
              </select>
            </div>

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
                <option value="">Select a clinic</option>
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
                {timeSlots.length === 0 ? (
                  <p className="text-slate-500">
                    No available time slots for this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
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
                          className={`px-4 py-3 rounded-xl border font-medium transition ${
                            !slot.available
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-200 hover:border-blue-500 hover:text-blue-600"
                          }`}
                        >
                          {slot.time}
                          {!slot.available && (
                            <span className="block text-xs mt-1">Unavailable</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Appointment Details */}
            {selectedSlot && clinic && date && (
              <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm font-semibold text-blue-600 mb-3">
                  SELECTED APPOINTMENT
                </p>
                <div className="space-y-2">
                  <p className="text-slate-700">
                    <strong>Clinic:</strong>{" "}
                    {clinics.find((item) => item._id === clinic)?.name}
                  </p>
                  <p className="text-slate-700">
                    <strong>Date:</strong> {date}
                  </p>
                  <p className="text-slate-700">
                    <strong>Time:</strong> {selectedSlot}
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!clinic || !date || !selectedSlot}
                className={`px-6 py-3 rounded-xl font-semibold transition ${
                  !clinic || !date || !selectedSlot
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
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
              <p className="section-label">MY APPOINTMENTS</p>
              <h2>Appointment Status</h2>
              <p>View your upcoming and past vaccination appointments.</p>
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
              <div className="empty-icon">📅</div>
              <h3>No appointments yet</h3>
              <p>Your booked appointments will appear here.</p>
            </div>
          ) : (
            <div>
              {/* Upcoming Appointments */}
              <h3 style={{ marginBottom: "15px", color: "#334155" }}>
                Upcoming Appointments
              </h3>

              {upcomingAppointments.length === 0 ? (
                <div className="empty-workers">
                  <p>No upcoming appointments.</p>
                </div>
              ) : (
                <div className="workers-grid">
                  {upcomingAppointments.map((appointment) => (
                    <div className="worker-card" key={appointment._id}>
                      <div className="worker-avatar">📅</div>
                      <div className="worker-info">
                        <h3>
                          {appointment.clinicId?.name || "Unknown Clinic"}
                        </h3>
                        <p>
                          {appointment.clinicId?.location ||
                            "Location unavailable"}
                        </p>

                        {appointment.familyProfileId ? (
                          <p>
                            <strong>For:</strong>{" "}
                            {appointment.familyProfileId.name}
                          </p>
                        ) : (
                          <p>
                            <strong>For:</strong> {user?.name || "Myself"}
                          </p>
                        )}

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

                      <div>
                        <span
                          className={`worker-role ${
                            appointment.status === "Confirmed"
                              ? "status-confirmed"
                              : "status-pending"
                          }`}
                        >
                          {appointment.status}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleCancelAppointment(appointment._id)
                          }
                          style={{
                            display: "block",
                            marginTop: "10px",
                            padding: "7px 12px",
                            border: "none",
                            borderRadius: "8px",
                            background: "#fee2e2",
                            color: "#dc2626",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Past Appointments */}
              <h3
                style={{
                  marginTop: "30px",
                  marginBottom: "15px",
                  color: "#334155",
                }}
              >
                Past Appointments
              </h3>

              {pastAppointments.length === 0 ? (
                <div className="empty-workers">
                  <p>No past appointments.</p>
                </div>
              ) : (
                <div className="workers-grid">
                  {pastAppointments.map((appointment) => (
                    <div className="worker-card" key={appointment._id}>
                      <div className="worker-avatar">📅</div>
                      <div className="worker-info">
                        <h3>
                          {appointment.clinicId?.name || "Unknown Clinic"}
                        </h3>
                        <p>
                          {appointment.clinicId?.location ||
                            "Location unavailable"}
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
                          appointment.status === "Cancelled"
                            ? "status-cancelled"
                            : appointment.status === "Completed"
                            ? "status-confirmed"
                            : "status-pending"
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default BookAppointment;