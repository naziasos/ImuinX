
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const DutyAssignment = require("../models/DutyAssignment");
const User = require("../models/User");
const VaccineInventory = require("../models/VaccineInventory");

const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

// Get today's date in the configured local timezone.
const getLocalDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  parts.forEach(({ type, value }) => {
    if (type !== "literal") values[type] = value;
  });

  return `${values.year}-${values.month}-${values.day}`;
};

// Bangladesh local day boundaries, represented as UTC timestamps.
const getDayRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00+06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
};

const isValidDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

// =====================================================
// GET WORKER APPOINTMENTS
// GET /api/worker-appointments/today
// Optional filter: ?date=YYYY-MM-DD
// No date means all appointments from today onward.
// =====================================================
const getWorkerAppointments = async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        message: "Worker access required",
      });
    }

    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    if (!worker.clinicId) {
      return res.status(400).json({
        message: "Worker is not assigned to any clinic",
      });
    }

    const today = getLocalDateString();
    const { date } = req.query;

    if (date && !isValidDate(date)) {
      return res.status(400).json({
        message: "Invalid date. Use YYYY-MM-DD format.",
      });
    }

    let dateFilter;

    if (date) {
      const { start, end } = getDayRange(date);

      dateFilter = {
        $gte: start,
        $lt: end,
      };
    } else {
      const { start } = getDayRange(today);
      dateFilter = {
        $gte: start,
      };
    }

    const { start: todayStart, end: todayEnd } =
      getDayRange(today);

    const todayDuty = await DutyAssignment.findOne({
      workerId: worker._id,
      clinicId: worker.clinicId,
      dutyDate: {
        $gte: todayStart,
        $lt: todayEnd,
      },
      dutyType: "Vaccination",
    });

    const appointments = await Appointment.find({
      clinicId: worker.clinicId,
      assignedWorkerId: worker._id,
      dateTime: dateFilter,
      status: { $ne: "Cancelled" },
    })
      // IMPORTANT:
      // dateOfBirth is needed for age-based Log Dose
      .populate(
        "citizenId",
        "name email dateOfBirth"
      )
      .populate(
        "familyProfileId",
        "name relationship gender dateOfBirth"
      )
      .populate(
        "clinicId",
        "name location contact"
      )
      .populate(
        "vaccineId",
        "name code"
      )
      .populate(
        "assignedWorkerId",
        "name email"
      )
      .sort({ dateTime: 1 });

    return res.json({
      dutyAssigned: Boolean(todayDuty),
      appointments,
      filterDate: date || null,
      total: appointments.length,
    });
  } catch (error) {
    console.error(
      "Worker appointment fetch error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while loading appointments",
    });
  }
};

// =====================================================
// GET CLINIC INVENTORY FOR WORKER
// =====================================================

const getWorkerInventory = async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        message: "Worker access required",
      });
    }

    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    if (!worker.clinicId) {
      return res.status(400).json({
        message:
          "Worker is not assigned to any clinic",
      });
    }

    const inventory = await VaccineInventory.find({
      clinicId: worker.clinicId,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    })
      .populate(
        "vaccineId",
        "name code description"
      )
      .sort({
        expiryDate: 1,
      });

    return res.json({
      inventory,
    });
  } catch (error) {
    console.error(
      "Worker inventory fetch error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while loading inventory",
    });
  }
};

// =====================================================
// COMPLETE AN ASSIGNED APPOINTMENT
// =====================================================

const completeWorkerAppointment = async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        message: "Worker access required",
      });
    }

    const { appointmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    if (!worker.clinicId) {
      return res.status(400).json({
        message: "Worker is not assigned to any clinic",
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      clinicId: worker.clinicId,
      assignedWorkerId: worker._id,
    })
      .populate("citizenId", "name email")
      .populate(
        "familyProfileId",
        "name relationship gender dateOfBirth"
      );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found or not assigned to you",
      });
    }

    if (appointment.status !== "Confirmed") {
      return res.status(400).json({
        message: "Only confirmed appointments can be completed",
      });
    }

    const appointmentDate = getLocalDateString(
      new Date(appointment.dateTime)
    );
    const { start, end } = getDayRange(appointmentDate);

    const duty = await DutyAssignment.findOne({
      workerId: worker._id,
      clinicId: worker.clinicId,
      dutyDate: {
        $gte: start,
        $lt: end,
      },
      dutyType: "Vaccination",
    });

    if (!duty) {
      return res.status(403).json({
        message:
          "You do not have vaccination duty for this appointment date.",
      });
    }

    appointment.status = "Completed";
    await appointment.save();

    return res.json({
      message:
        "Appointment completed successfully. Please log the administered dose.",
      appointmentId: appointment._id,
      status: appointment.status,
      patient: appointment.familyProfileId
        ? {
            id: appointment.familyProfileId._id,
            type: "family",
            name: appointment.familyProfileId.name,
            relationship: appointment.familyProfileId.relationship,
            dateOfBirth: appointment.familyProfileId.dateOfBirth,
            gender: appointment.familyProfileId.gender,
          }
        : {
            id: appointment.citizenId?._id,
            type: "user",
            name: appointment.citizenId?.name,
            email: appointment.citizenId?.email,
          },
    });
  } catch (error) {
    console.error("Appointment completion error:", error);

    return res.status(500).json({
      message: "Server error while completing appointment",
    });
  }
};

module.exports = {
  getWorkerAppointments,
  getWorkerInventory,
  completeWorkerAppointment,
};
