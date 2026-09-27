const express = require("express");
const router = express.Router();

const Appointment = require("../models/Appointment");

// Temporary available time slots
const ALL_TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
];

// Get available slots for a clinic and date
router.get("/slots", async (req, res) => {
  try {
    const { clinicId, date } = req.query;

    if (!clinicId || !date) {
      return res.status(400).json({
        message: "clinicId and date are required",
      });
    }

    // Find appointments already booked for this clinic and date
    const appointments = await Appointment.find({
      clinicId,
      dateTime: {
        $gte: new Date(`${date}T00:00:00`),
        $lt: new Date(`${date}T23:59:59`),
      },
      status: {
        $ne: "Cancelled",
      },
    });

    // Convert booked dateTime into time strings
    const bookedSlots = appointments.map((appointment) => {
      return appointment.dateTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    });

    // Return only slots that are not booked
    const availableSlots = ALL_TIME_SLOTS.filter(
      (slot) => !bookedSlots.includes(slot)
    );

    res.json({
      clinicId,
      date,
      availableSlots,
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);

    res.status(500).json({
      message: "Failed to fetch available slots",
    });
  }
});

// Create a new appointment booking
router.post("/", async (req, res) => {
  try {
    const { citizenId, clinicId, date, time } = req.body;

    // Check required fields
    if (!citizenId || !clinicId || !date || !time) {
      return res.status(400).json({
        message: "citizenId, clinicId, date and time are required",
      });
    }

    // Convert date + time into Date object
    const appointmentDateTime = new Date(`${date} ${time}`);

    if (isNaN(appointmentDateTime.getTime())) {
      return res.status(400).json({
        message: "Invalid date or time",
      });
    }

    // Check whether this slot is already booked
    const existingAppointment = await Appointment.findOne({
      clinicId,
      dateTime: appointmentDateTime,
      status: {
        $ne: "Cancelled",
      },
    });

    if (existingAppointment) {
      return res.status(409).json({
        message: "This time slot is already booked",
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      citizenId,
      clinicId,
      dateTime: appointmentDateTime,
      status: "Pending",
    });

    // Return booking confirmation
    res.status(201).json({
      message: "Appointment booked successfully",
      appointmentId: appointment._id,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);

    res.status(500).json({
      message: "Failed to create appointment",
    });
  }
});
// Test route
// Get pending appointments for a clinic
router.get("/clinic/:clinicId", async (req, res) => {
  try {
    const { clinicId } = req.params;

    const appointments = await Appointment.find({
      clinicId,
      status: "Pending",
    })
      .populate("citizenId", "name email")
      .sort({ dateTime: 1 });

    res.json({
      appointments,
    });
  } catch (error) {
    console.error("Error fetching clinic appointments:", error);

    res.status(500).json({
      message: "Failed to fetch clinic appointments",
    });
  }
});
// Get appointments for a citizen
router.get("/citizen/:citizenId", async (req, res) => {
  try {
    const { citizenId } = req.params;

    const appointments = await Appointment.find({
      citizenId,
    })
      .populate("clinicId", "name location contact")
      .sort({ dateTime: 1 });

    res.json({
      appointments,
    });
  } catch (error) {
    console.error("Error fetching citizen appointments:", error);

    res.status(500).json({
      message: "Failed to fetch citizen appointments",
    });
  }
});
// Approve an appointment
router.patch("/:appointmentId/approve", async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: "Confirmed" },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    res.json({
      message: "Appointment approved successfully",
      appointmentId: appointment._id,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Error approving appointment:", error);

    res.status(500).json({
      message: "Failed to approve appointment",
    });
  }
});

// Reject an appointment
router.patch("/:appointmentId/reject", async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: "Cancelled" },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    res.json({
      message: "Appointment rejected successfully",
      appointmentId: appointment._id,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Error rejecting appointment:", error);

    res.status(500).json({
      message: "Failed to reject appointment",
    });
  }
});
router.get("/test", (req, res) => {
  res.json({
    message: "Appointment API is working",
  });
});

module.exports = router;