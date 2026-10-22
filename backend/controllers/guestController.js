
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const GuestProfile = require("../models/GuestProfile");
const DoseRecord = require("../models/DoseRecord");
const Certificate = require("../models/Certificate");
const VaccineInventory = require("../models/VaccineInventory");
const User = require("../models/User");

const certificateService = require("../services/certificateService");
const { sendGuestCertificateReadyEmail } = require("../utils/email");

const cleanCode = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const cleanEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

// ---------------------------------------------------------------------------
// Worker side
// ---------------------------------------------------------------------------

async function getStaff(req) {
  const user = await User.findById(req.user._id || req.user.id);

  if (
    !user ||
    !["worker", "clinicAdmin"].includes(user.role) ||
    !user.clinicId
  ) {
    return null;
  }

  return user;
}

async function loadGuestAppointment(code, staff) {
  const appointment = await Appointment.findOne({ bookingCode: code })
    .populate("guestProfileId")
    .populate("vaccineId", "name code isActive")
    .populate("clinicId", "name");

  if (!appointment || !appointment.guestProfileId) {
    return {
      error: {
        status: 404,
        message: "No appointment found with this ID.",
      },
    };
  }

  if (String(appointment.clinicId._id) !== String(staff.clinicId)) {
    return {
      error: {
        status: 403,
        message: "This appointment is booked at a different clinic.",
      },
    };
  }

  return { appointment };
}

// POST /api/guest/worker/lookup
exports.lookup = async (req, res) => {
  try {
    const staff = await getStaff(req);

    if (!staff) {
      return res.status(403).json({
        message: "Only clinic staff can do this.",
      });
    }

    const code = cleanCode(req.body?.bookingCode);

    if (!code) {
      return res.status(400).json({
        message: "Enter the Appointment ID.",
      });
    }

    const { appointment, error } = await loadGuestAppointment(code, staff);

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const guest = appointment.guestProfileId;

    const dose = await DoseRecord.findOne({
      appointmentId: appointment._id,
    });

    const batches = await VaccineInventory.find({
      clinicId: staff.clinicId,
      vaccineId: appointment.vaccineId._id,
      quantity: { $gte: 1 },
      expiryDate: { $gt: new Date() },
    })
      .sort({ expiryDate: 1 })
      .select("batchNumber quantity expiryDate")
      .lean();

    return res.json({
      appointment: {
        id: appointment._id,
        bookingCode: appointment.bookingCode,
        status: appointment.status,
        dateTime: appointment.dateTime,
        doseNumber: appointment.doseNumber,
        vaccine: appointment.vaccineId.name,
        clinic: appointment.clinicId.name,
        alreadyVaccinated: !!dose,
      },
      guest: {
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        dateOfBirth: guest.dateOfBirth,
        gender: guest.gender,
      },
      batches,
    });
  } catch (error) {
    console.error("Guest lookup error:", error);

    return res.status(500).json({
      message: "Could not look up the appointment.",
    });
  }
};

// POST /api/guest/worker/verify-and-dose
exports.verifyAndLogDose = async (req, res) => {
  let reserved = null;

  try {
    const staff = await getStaff(req);

    if (!staff) {
      return res.status(403).json({
        message: "Only clinic staff can do this.",
      });
    }

    const code = cleanCode(req.body?.bookingCode);
    const idType =
      typeof req.body?.idType === "string" ? req.body.idType.trim() : "";
    const idNumber =
      typeof req.body?.idNumber === "string" ? req.body.idNumber.trim() : "";
    const batchNumber =
      typeof req.body?.batchNumber === "string"
        ? req.body.batchNumber.trim()
        : "";

    if (!code || !idType || idNumber.length < 4 || !batchNumber) {
      return res.status(400).json({
        message:
          "Appointment ID, photo ID details and a vaccine batch are required.",
      });
    }

    const { appointment, error } = await loadGuestAppointment(code, staff);

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    if (appointment.status === "Cancelled") {
      return res.status(400).json({
        message: "This appointment was cancelled.",
      });
    }

    if (appointment.status === "Completed") {
      return res.status(409).json({
        message: "This person is already vaccinated.",
      });
    }

    if (await DoseRecord.findOne({ appointmentId: appointment._id })) {
      return res.status(409).json({
        message: "A dose is already logged for this ID.",
      });
    }

    if (appointment.vaccineId.isActive === false) {
      return res.status(400).json({
        message: "This vaccine is no longer active.",
      });
    }

    reserved = await VaccineInventory.findOneAndUpdate(
      {
        clinicId: staff.clinicId,
        vaccineId: appointment.vaccineId._id,
        batchNumber,
        expiryDate: { $gt: new Date() },
        quantity: { $gte: 1 },
      },
      { $inc: { quantity: -1 } },
      { returnDocument: "after" }
    );

    if (!reserved) {
      return res.status(400).json({
        message:
          "That batch is unknown, expired or out of stock. Pick another batch.",
      });
    }

    let record;

    try {
      record = await DoseRecord.create({
        citizenId: appointment.guestProfileId._id,
        citizenType: "GuestProfile",
        vaccineType: appointment.vaccineId.name,
        doseNumber: appointment.doseNumber,
        batchNumber,
        healthWorkerId: staff._id,
        healthWorkerName: staff.name,
        healthWorkerEmail: staff.email,
        clinicId: staff.clinicId,
        appointmentId: appointment._id,
      });
    } catch (createError) {
      await VaccineInventory.updateOne(
        { _id: reserved._id },
        { $inc: { quantity: 1 } }
      );

      reserved = null;
      throw createError;
    }

    appointment.status = "Completed";
    appointment.identityVerifiedAt = new Date();
    appointment.identityVerifiedBy = staff._id;
    await appointment.save();

    await GuestProfile.updateOne(
      { _id: appointment.guestProfileId._id },
      { $set: { idType, idLast4: idNumber.slice(-4) } }
    );

    let certificateIssued = false;

    try {
      await certificateService.issueForDose(record);
      certificateIssued = true;

      sendGuestCertificateReadyEmail(
        appointment.guestProfileId.email,
        {
          name: appointment.guestProfileId.name,
          vaccine: appointment.vaccineId.name,
          bookingCode: appointment.bookingCode,
        }
      ).catch((emailError) =>
        console.error(
          "Guest certificate email error:",
          emailError.message
        )
      );
    } catch (certificateError) {
      console.error(
        `Guest certificate issuance failed for dose ${record._id}:`,
        certificateError.message
      );
    }

    return res.status(201).json({
      message: certificateIssued
        ? "Identity verified, dose logged and certificate generated."
        : "Identity verified and dose logged. Certificate will be generated shortly.",
      doseRecordId: record._id,
      certificateIssued,
      remainingStock: reserved.quantity,
    });
  } catch (error) {
    if (reserved) {
      await VaccineInventory.updateOne(
        { _id: reserved._id },
        { $inc: { quantity: 1 } }
      ).catch(() => {});
    }

    console.error("Guest verify-and-dose error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Could not log the dose.",
    });
  }
};

// ---------------------------------------------------------------------------
// Public guest certificate lookup: Appointment ID + booking email
// ---------------------------------------------------------------------------

const LOOKUP_WINDOW_MS = 10 * 60 * 1000;
const LOOKUP_MAX_REQUESTS = 10;
const lookupHits = new Map();

function isLookupLimited(ip) {
  const now = Date.now();
  const key = ip || "unknown";
  const entry = lookupHits.get(key);

  if (!entry || now - entry.start >= LOOKUP_WINDOW_MS) {
    lookupHits.set(key, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > LOOKUP_MAX_REQUESTS;
}

async function findVaccinatedGuest(code, email) {
  const appointment = await Appointment.findOne({
    bookingCode: code,
    status: "Completed",
  }).populate("guestProfileId");

  if (
    !appointment ||
    !appointment.guestProfileId ||
    cleanEmail(appointment.guestProfileId.email) !== email
  ) {
    return null;
  }

  return appointment;
}

// POST /api/guest/certificate/lookup
// Body: { bookingCode, email }
exports.lookupGuestCertificate = async (req, res) => {
  try {
    if (isLookupLimited(req.ip || req.socket?.remoteAddress || "unknown")) {
      return res.status(429).json({
        message: "Too many attempts. Please try again later.",
      });
    }

    const code = cleanCode(req.body?.bookingCode);
    const email = cleanEmail(req.body?.email);

    if (!code || !email) {
      return res.status(400).json({
        message: "Appointment ID and email are required.",
      });
    }

    const appointment = await findVaccinatedGuest(code, email);

    if (!appointment) {
      return res.status(404).json({
        message:
          "Certificate not found. Check your Appointment ID and booking email.",
      });
    }

    const dose = await DoseRecord.findOne({
      appointmentId: appointment._id,
      citizenId: appointment.guestProfileId._id,
      citizenType: "GuestProfile",
    });

    if (!dose) {
      return res.status(404).json({
        message:
          "No vaccination record was found for this appointment. Please contact the clinic.",
      });
    }

    let certificate = await Certificate.findOne({
      doseRecordId: dose._id,
      citizenId: appointment.guestProfileId._id,
      citizenType: "GuestProfile",
    });

    if (!certificate) {
      const issued = await certificateService.issueForDose(dose);
      certificate = issued.certificate;
    }

    if (certificate.revokedAt) {
      return res.status(410).json({
        message:
          "This certificate has been revoked. Please contact the clinic.",
      });
    }

    if (
      !certificate.expiryDate ||
      new Date(certificate.expiryDate).getTime() <= Date.now()
    ) {
      return res.status(410).json({
        message:
          "This certificate has expired. Please contact the clinic.",
      });
    }

    const payload = await certificateService.buildQrPayload(
      certificate,
      dose.dateAdministered
    );

    const hasAccount = Boolean(
      await User.exists({ email: appointment.guestProfileId.email })
    );

    return res.json({
      holder: {
        name: appointment.guestProfileId.name,
        dateOfBirth: appointment.guestProfileId.dateOfBirth,
      },
      dose: {
        vaccine: dose.vaccineType,
        doseNumber: dose.doseNumber,
        batchNumber: dose.batchNumber,
        dateAdministered: dose.dateAdministered,
      },
      certificate: payload,
      hasAccount,
    });
  } catch (error) {
    console.error("Guest certificate lookup error:", error);

    return res.status(500).json({
      message: "Could not load the certificate. Please try again later.",
    });
  }
};
