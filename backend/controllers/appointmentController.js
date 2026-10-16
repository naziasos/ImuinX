
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");
const Clinic = require("../models/Clinic");
const Vaccine = require("../models/Vaccine");
const VaccineSchedule = require("../models/VaccineSchedule");
const DutyAssignment = require("../models/DutyAssignment");

const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

// Generate 20 slots from 09:00 AM, at 5-minute intervals.
const ALL_TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const totalMinutes = 9 * 60 + i * 5;
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
});

function getLocalDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTimeSlot(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toUpperCase();
}

function parseAppointmentDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;

  const match = (time || "").match(/^(\d{2}):(\d{2}) (AM|PM)$/);
  if (!match) return null;

  const [, hourText, minuteText, period] = match;
  let hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    hour < 1 ||
    hour > 12 ||
    minute < 0 ||
    minute > 59 ||
    !ALL_TIME_SLOTS.includes(time)
  ) {
    return null;
  }

  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;

  // Bangladesh Standard Time is UTC+06:00.
  const result = new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+06:00`
  );

  // Reject impossible calendar dates.
  if (getLocalDateString(result) !== date) return null;

  return result;
}

// Bangladesh-local calendar day for appointment queries.
function getDayRange(date) {
  const start = new Date(`${date}T00:00:00+06:00`);

  return {
    $gte: start,
    $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

// DutyAssignment records are created using the selected calendar date.
// Query that calendar date using UTC boundaries.
function getDutyDateRange(date) {
  const start = new Date(`${date}T00:00:00.000Z`);

  return {
    $gte: start,
    $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

function isStaffRole(role) {
  return role === "worker" || role === "clinicAdmin";
}

async function getLoggedInUser(req) {
  return User.findById(req.user._id || req.user.id);
}

async function getRecipient(citizenId, familyProfileId, guardianId) {
  if (familyProfileId) {
    if (!mongoose.Types.ObjectId.isValid(familyProfileId)) return null;

    return FamilyProfile.findOne({
      _id: familyProfileId,
      guardianId,
    });
  }

  return User.findById(citizenId);
}

// Automatically choose the eligible vaccination worker
// with the fewest active appointments on the selected day.
// This distributes appointments across the available workers.
async function selectVaccinationWorker(clinicId, date) {
  const duties = await DutyAssignment.find({
    clinicId,
    dutyType: "Vaccination",
    dutyDate: getDutyDateRange(date),
    workerId: { $ne: null },
  }).sort({ _id: 1 });

  // Remove duplicate worker IDs defensively.
  const workerIds = [
    ...new Set(
      duties
        .map((duty) => duty.workerId && String(duty.workerId))
        .filter(Boolean)
    ),
  ];

  if (workerIds.length === 0) {
    return null;
  }

  // Only workers who still exist and have the worker role are eligible.
  const workers = await User.find({
    _id: { $in: workerIds },
    role: "worker",
    clinicId,
  }).select("_id name email");

  if (workers.length === 0) {
    return null;
  }

  // Count each eligible worker's non-cancelled appointments for this day.
  const workload = await Appointment.aggregate([
    {
      $match: {
        clinicId: new mongoose.Types.ObjectId(String(clinicId)),
        assignedWorkerId: {
          $in: workers.map((worker) => worker._id),
        },
        dateTime: getDayRange(date),
        status: { $ne: "Cancelled" },
      },
    },
    {
      $group: {
        _id: "$assignedWorkerId",
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = new Map(
    workload.map((item) => [String(item._id), item.count])
  );

  // Pick the worker with the smallest workload.
  // Worker ID provides a stable tie-breaker.
  workers.sort((a, b) => {
    const countDifference =
      (counts.get(String(a._id)) || 0) -
      (counts.get(String(b._id)) || 0);

    if (countDifference !== 0) return countDifference;

    return String(a._id).localeCompare(String(b._id));
  });

  return workers[0];
}

// GET /slots?clinicId=...&date=YYYY-MM-DD
exports.getAvailableSlots = async (req, res) => {
  try {
    const { clinicId, date } = req.query;

    if (
      !clinicId ||
      !mongoose.Types.ObjectId.isValid(clinicId) ||
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        message: "A valid clinicId and date are required.",
      });
    }

    const dayRange = getDayRange(date);

    const appointments = await Appointment.find({
      clinicId,
      dateTime: dayRange,
      status: { $ne: "Cancelled" },
    }).select("dateTime");

    const bookedSlots = new Set(
      appointments.map((item) => formatTimeSlot(item.dateTime))
    );

    const now = new Date();
    const today = getLocalDateString(now);

    const availableSlots = ALL_TIME_SLOTS.filter((slot) => {
      if (bookedSlots.has(slot)) return false;

      if (date === today) {
        const slotDateTime = parseAppointmentDateTime(date, slot);
        if (!slotDateTime || slotDateTime <= now) return false;
      }

      return true;
    });

    return res.json({ clinicId, date, availableSlots });
  } catch (error) {
    console.error("Get available slots error:", error);

    return res.status(500).json({
      message: "Failed to fetch available slots.",
    });
  }
};

// POST /
exports.createAppointment = async (req, res) => {
  try {
    const citizenId = String(req.user._id || req.user.id);

    const {
      familyProfileId,
      clinicId,
      vaccineId,
      doseNumber,
      date,
      time,
    } = req.body;

    if (
      !clinicId ||
      !vaccineId ||
      doseNumber === undefined ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        message: "Clinic, vaccine, dose number, date and time are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(clinicId) ||
      !mongoose.Types.ObjectId.isValid(vaccineId)
    ) {
      return res.status(400).json({
        message: "Invalid clinic or vaccine reference.",
      });
    }

    const dose = Number(doseNumber);

    if (!Number.isInteger(dose) || dose < 1) {
      return res.status(400).json({
        message: "Dose number must be a positive whole number.",
      });
    }

    const account = await getLoggedInUser(req);

    if (!account || account.role !== "citizen") {
      return res.status(403).json({
        message: "Only citizens can book appointments.",
      });
    }

    const clinic = await Clinic.findById(clinicId);

    if (!clinic) {
      return res.status(404).json({
        message: "Clinic not found.",
      });
    }

    const vaccine = await Vaccine.findOne({
      _id: vaccineId,
      isActive: true,
    });

    if (!vaccine) {
      return res.status(400).json({
        message: "Selected vaccine is unavailable.",
      });
    }

    const schedules = await VaccineSchedule.find({
      vaccineId,
      "doses.doseNumber": dose,
    });

    if (!schedules.length) {
      return res.status(400).json({
        message:
          "This dose is not included in the selected vaccine schedule.",
      });
    }

    const recipient = await getRecipient(
      citizenId,
      familyProfileId || null,
      citizenId
    );

    if (!recipient) {
      return res.status(400).json({
        message: "Invalid family profile or vaccination recipient.",
      });
    }

    // Validate recipient age when a date of birth is available.
    if (recipient.dateOfBirth) {
      const ageDays = Math.floor(
        (Date.now() - new Date(recipient.dateOfBirth).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      const eligibleSchedule = schedules.some((schedule) => {
        const maxAge = schedule.maxAgeDays;

        return (
          ageDays >= schedule.minAgeDays &&
          (maxAge == null || ageDays <= maxAge)
        );
      });

      if (!eligibleSchedule) {
        return res.status(400).json({
          message:
            "The selected dose is outside the recipient's scheduled age range.",
        });
      }
    }

    const appointmentDateTime = parseAppointmentDateTime(date, time);

    if (!appointmentDateTime) {
      return res.status(400).json({
        message: "Invalid date or time slot.",
      });
    }

    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({
        message: "Cannot book an appointment in the past.",
      });
    }

    // Preserve the existing rule: one appointment per recipient per day.
    const personQuery = {
      dateTime: getDayRange(date),
      status: { $ne: "Cancelled" },
    };

    if (familyProfileId) {
      personQuery.familyProfileId = familyProfileId;
    } else {
      personQuery.citizenId = citizenId;
      personQuery.familyProfileId = null;
    }

    const existingPersonAppointment =
      await Appointment.findOne(personQuery);

    if (existingPersonAppointment) {
      return res.status(409).json({
        message:
          "This person already has an appointment booked for this day. Only one appointment per person per day is allowed.",
      });
    }

    // Preserve the existing clinic-wide slot rule.
    const existingSlot = await Appointment.findOne({
      clinicId,
      dateTime: appointmentDateTime,
      status: { $ne: "Cancelled" },
    });

    if (existingSlot) {
      return res.status(409).json({
        message: "This time slot is already booked.",
      });
    }

    // Automatically select an eligible worker for this clinic and date.
    const selectedWorker = await selectVaccinationWorker(
      clinicId,
      date
    );

    // Preserve booking behavior if no worker has been assigned duty.
    // The appointment can be booked but will remain unassigned.
    const appointment = await Appointment.create({
      citizenId,
      familyProfileId: familyProfileId || null,
      clinicId,
      vaccineId,
      doseNumber: dose,
      dateTime: appointmentDateTime,
      assignedWorkerId: selectedWorker?._id || null,
      status: "Confirmed",
    });

    return res.status(201).json({
      message: selectedWorker
        ? "Appointment booked and worker assigned successfully."
        : "Appointment booked successfully, but no vaccination worker is assigned for this date.",
      appointmentId: appointment._id,
      status: appointment.status,
      assignedWorkerId: appointment.assignedWorkerId,
    });
  } catch (error) {
    console.error("Create appointment error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create appointment.",
    });
  }
};

// GET /clinic/:clinicId
exports.getClinicAppointments = async (req, res) => {
  try {
    const { clinicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({
        message: "Invalid clinic reference.",
      });
    }

    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    if (
      user.role !== "admin" &&
      (!isStaffRole(user.role) || String(user.clinicId) !== clinicId)
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this clinic's appointments.",
      });
    }

    const appointments = await Appointment.find({
      clinicId,
      status: { $ne: "Cancelled" },
    })
      .populate("citizenId", "name email")
      .populate(
        "familyProfileId",
        "name relationship gender dateOfBirth"
      )
      .populate("vaccineId", "name code")
      .populate("assignedWorkerId", "name email phone")
      .sort({ dateTime: 1 });

    return res.json({ appointments });
  } catch (error) {
    console.error("Get clinic appointments error:", error);

    return res.status(500).json({
      message: "Failed to fetch clinic appointments.",
    });
  }
};

// GET /citizen/:citizenId
exports.getCitizenAppointments = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const loggedInId = String(req.user._id || req.user.id);
    const user = await getLoggedInUser(req);

    if (!mongoose.Types.ObjectId.isValid(citizenId)) {
      return res.status(400).json({
        message: "Invalid citizen reference.",
      });
    }

    const isAdmin = user?.role === "admin";
    const isStaff = isStaffRole(user?.role);

    if (citizenId !== loggedInId && !isAdmin && !isStaff) {
      return res.status(403).json({
        message: "You can only view your own appointments.",
      });
    }

    const appointments = await Appointment.find({ citizenId })
      .populate("clinicId", "name location contact")
      .populate(
        "familyProfileId",
        "name relationship gender dateOfBirth"
      )
      .populate("vaccineId", "name code")
      .populate("assignedWorkerId", "name email phone")
      .sort({ dateTime: 1 });

    return res.json({ appointments });
  } catch (error) {
    console.error("Get citizen appointments error:", error);

    return res.status(500).json({
      message: "Failed to fetch citizen appointments.",
    });
  }
};

// PATCH /:appointmentId/cancel
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment reference.",
      });
    }

    const citizenId = String(req.user._id || req.user.id);
    const user = await getLoggedInUser(req);

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found.",
      });
    }

    const isOwner = String(appointment.citizenId) === citizenId;
    const isAdmin = user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to cancel this appointment.",
      });
    }

    if (appointment.status === "Completed") {
      return res.status(400).json({
        message: "A completed appointment cannot be cancelled.",
      });
    }

    if (appointment.status === "Cancelled") {
      return res.status(400).json({
        message: "This appointment is already cancelled.",
      });
    }

    appointment.status = "Cancelled";
    await appointment.save();

    return res.json({
      message: "Appointment cancelled successfully.",
      appointmentId: appointment._id,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);

    return res.status(500).json({
      message: "Failed to cancel appointment.",
    });
  }
};

exports.testAppointmentApi = (req, res) => {
  return res.json({
    message: "Appointment API is working.",
  });
};
