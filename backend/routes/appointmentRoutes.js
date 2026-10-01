const express = require("express");
const router = express.Router();

const Appointment = require("../models/Appointment");
const FamilyProfile = require("../models/FamilyProfile");

// Generate 20 time slots starting from 09:00 AM with 5-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  let startHour = 9;
  let startMinute = 0;
  const interval = 5;
  const totalSlots = 20;

  for (let i = 0; i < totalSlots; i++) {
    let hour = startHour;
    let minute = startMinute + (i * interval);
    
    hour += Math.floor(minute / 60);
    minute = minute % 60;

    const period = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12;
    displayHour = displayHour ? displayHour : 12;

    const formattedHour = String(displayHour).padStart(2, "0");
    const formattedMinute = String(minute).padStart(2, "0");

    slots.push(`${formattedHour}:${formattedMinute} ${period}`);
  }
  return slots;
};

const ALL_TIME_SLOTS = generateTimeSlots();

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
        $lte: new Date(`${date}T23:59:59`),
      },
      status: {
        $ne: "Cancelled",
      },
    });

    // Convert booked dateTime into time strings
    const bookedSlots = appointments.map((appointment) => {
      return appointment.toLocaleTimeString ? appointment.dateTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) : "";
    });

    const now = new Date();
    // Format current date as YYYY-MM-DD local time string for comparison
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Filter slots: remove booked slots AND past time slots if date is today
    const availableSlots = ALL_TIME_SLOTS.filter((slot) => {
      if (bookedSlots.includes(slot)) {
        return false;
      }

      if (date === todayStr) {
        // Parse slot string into a Date object for today to compare against current time
        const slotDateTime = new Date(`${date} ${slot}`);
        if (slotDateTime <= now) {
          return false; // Time has already passed today
        }
      }

      return true;
    });

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
    const { citizenId, familyProfileId, clinicId, date, time } = req.body;

    if (!citizenId || !clinicId || !date || !time) {
      return res.status(400).json({
        message: "citizenId, clinicId, date and time are required",
      });
    }

    let selectedFamilyProfile = null;

    if (familyProfileId) {
      selectedFamilyProfile = await FamilyProfile.findOne({
        _id: familyProfileId,
        guardianId: citizenId,
      });

      if (!selectedFamilyProfile) {
        return res.status(400).json({
          message: "Invalid family profile",
        });
      }
    }

    const appointmentDateTime = new Date(`${date} ${time}`);

    if (isNaN(appointmentDateTime.getTime())) {
      return res.status(400).json({
        message: "Invalid date or time",
      });
    }

    // Prevent booking appointments for past dates or times
    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({
        message: "Cannot book appointments for past times or dates.",
      });
    }

    // Check if this specific person (self or family member) already has an appointment on this date
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const duplicateQuery = {
      dateTime: { $gte: startOfDay,$lte: endOfDay },
      status: { $ne: "Cancelled" },
    };

    if (familyProfileId) {
      duplicateQuery.familyProfileId = familyProfileId;
    } else {
      duplicateQuery.citizenId = citizenId;
      duplicateQuery.familyProfileId = null;
    }

    const existingPersonAppointment = await Appointment.findOne(duplicateQuery);
    if (existingPersonAppointment) {
      return res.status(409).json({
        message: "This person already has an appointment booked for this day. Only one appointment per person per day is allowed.",
      });
    }

    // Check whether this specific time slot is already booked for the clinic
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
      familyProfileId: familyProfileId || null,
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

// Get pending appointments for a clinic
router.get("/clinic/:clinicId", async (req, res) => {
  try {
    const { clinicId } = req.params;

    const appointments = await Appointment.find({
      clinicId,
      status: "Pending",
    })
      .populate("citizenId", "name email")
      .populate("familyProfileId", "name relationship gender dateOfBirth")
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

// Get appointments for a citizen (includes family members' appointments)
router.get("/citizen/:citizenId", async (req, res) => {
  try {
    const { citizenId } = req.params;

    const appointments = await Appointment.find({
      citizenId,
    })
      .populate("clinicId", "name location contact")
      .populate("familyProfileId", "name relationship gender dateOfBirth")
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

// Cancel an appointment by citizen
router.patch("/:appointmentId/cancel", async (req, res) => {
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
      message: "Appointment cancelled successfully",
      appointmentId: appointment._id,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);

    res.status(500).json({
      message: "Failed to cancel appointment",
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