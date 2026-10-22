const mongoose = require("mongoose");
const crypto = require("crypto");

const Campaign = require("../models/Campaign");
const Appointment = require("../models/Appointment");
const Clinic = require("../models/Clinic");
const Vaccine = require("../models/Vaccine");
const GuestProfile = require("../models/GuestProfile");
const OTP = require("../models/OTP");
const { sendGuestOtpEmail, sendGuestBookingEmail } = require("../utils/email");
const appointmentController = require("./appointmentController");

const {
  getLocalDateString,
  getDayRange,
  parseAppointmentDateTime,
  formatDisplayDateTime,
  selectVaccinationWorker,
  ALL_TIME_SLOTS,
} = appointmentController.helpers;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRealDate(value) {
  return (
    DATE_RE.test(value || "") &&
    !Number.isNaN(new Date(`${value}T00:00:00+06:00`).getTime())
  );
}

function activeFilter() {
  return { isActive: true, endDate: { $gte: getLocalDateString() } };
}

// Clinics a campaign can be booked at (active only).
async function campaignClinics(campaign) {
  const filter = { status: "Active" };

  if (campaign.clinicIds && campaign.clinicIds.length) {
    filter._id = { $in: campaign.clinicIds };
  }

  return Clinic.find(filter).select("name location contact").lean();
}

function toPublic(campaign, clinics) {
  return {
    _id: campaign._id,
    title: campaign.title,
    description: campaign.description,
    vaccine: campaign.vaccineId
      ? {
          _id: campaign.vaccineId._id,
          name: campaign.vaccineId.name,
        }
      : null,
    doseNumber: campaign.doseNumber,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    clinics,
  };
}

// GET /api/campaigns/active  (public)
exports.getActiveCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find(activeFilter())
      .populate("vaccineId", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const result = [];

    for (const campaign of campaigns) {
      const clinics = await campaignClinics(campaign);
      if (clinics.length) result.push(toPublic(campaign, clinics));
    }

    return res.json({ campaigns: result });
  } catch (error) {
    console.error("Active campaigns error:", error.message);
    return res.status(500).json({ message: "Failed to fetch campaigns." });
  }
};

async function loadBookableCampaign(id) {
  if (!mongoose.isValidObjectId(id)) return null;

  return Campaign.findOne({ _id: id, ...activeFilter() }).populate(
    "vaccineId",
    "name isActive"
  );
}

// GET /api/campaigns/:id/slots?clinicId=&date=  (public)
exports.getCampaignSlots = async (req, res) => {
  try {
    const campaign = await loadBookableCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or ended." });
    }

    const { clinicId, date } = req.query;
    const clinics = await campaignClinics(campaign);

    if (!clinics.some((clinic) => String(clinic._id) === String(clinicId))) {
      return res
        .status(400)
        .json({ message: "This clinic is not part of the campaign." });
    }

    if (!isRealDate(date) || date < campaign.startDate || date > campaign.endDate) {
      return res.status(400).json({
        message: `Choose a date between ${campaign.startDate} and ${campaign.endDate}.`,
      });
    }

    return appointmentController.getAvailableSlots(req, res);
  } catch (error) {
    console.error("Campaign slots error:", error.message);
    return res.status(500).json({ message: "Failed to fetch slots." });
  }
};

// Light in-memory limiter: public endpoints, so keep abuse down.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;

function limited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.start >= WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

const OTP_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

function makeBookingCode() {
  // No 0/O/1/I so the code is easy to read out loud.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return `IMX-${code}`;
}

// Validate the whole booking form and the chosen clinic/date/slot.
// Returns { error: {status,message} } or { value }.
async function validateGuestBooking(campaign, body) {
  const { name, email, phone, dateOfBirth, gender, clinicId, date, time } =
    body || {};

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPhone = typeof phone === "string" ? phone.trim() : "";

  const fail = (message, status = 400) => ({ error: { status, message } });

  if (!campaign.vaccineId || campaign.vaccineId.isActive === false) {
    return fail("Campaign vaccine is unavailable.");
  }
  if (cleanName.length < 2 || cleanName.length > 80) {
    return fail("Please enter your full name.");
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return fail("Please enter a valid email address. We send your code there.");
  }
  if (cleanPhone && !PHONE_RE.test(cleanPhone)) {
    return fail("Please enter a valid phone number or leave it empty.");
  }
  if (!isRealDate(dateOfBirth) || new Date(dateOfBirth) > new Date()) {
    return fail("Please enter a valid date of birth.");
  }
  if (!["Male", "Female", "Other"].includes(gender)) {
    return fail("Please select a gender.");
  }
  if (!mongoose.isValidObjectId(clinicId)) {
    return fail("Please select a clinic.");
  }

  const clinics = await campaignClinics(campaign);
  const clinic = clinics.find((item) => String(item._id) === String(clinicId));

  if (!clinic) return fail("This clinic is not part of the campaign.");

  if (!isRealDate(date) || date < campaign.startDate || date > campaign.endDate) {
    return fail(
      `Choose a date between ${campaign.startDate} and ${campaign.endDate}.`
    );
  }
  if (!ALL_TIME_SLOTS.includes(time)) return fail("Invalid time slot.");

  const dateTime = parseAppointmentDateTime(date, time);

  if (!dateTime) return fail("Invalid date or time slot.");
  if (dateTime <= new Date()) {
    return fail("Cannot book an appointment in the past.");
  }

  // Allow one email to be shared by multiple guests. Prevent an obvious
  // duplicate for the same person using the same email + name + date of birth.
  // Each guest still receives a separate GuestProfile and Appointment.
  const guestDob = new Date(`${dateOfBirth}T00:00:00+06:00`);
  const profilesWithSameEmailAndDob = await GuestProfile.find({
    email: cleanEmail,
    dateOfBirth: guestDob,
  }).select("_id name");
  const matchingProfiles = profilesWithSameEmailAndDob.filter(
    (profile) => profile.name.trim().toLowerCase() === cleanName.toLowerCase()
  );

  const duplicate = matchingProfiles.length
    ? await Appointment.findOne({
        campaignId: campaign._id,
        guestProfileId: { $in: matchingProfiles.map((profile) => profile._id) },
        status: { $ne: "Cancelled" },
      })
    : null;

  if (duplicate) {
    return fail(
      `This person already has a booking for this campaign (ID ${duplicate.bookingCode}). Use the same email for other family members, but enter each person's own details.`,
      409
    );
  }

  const slotTaken = await Appointment.findOne({
    clinicId: clinic._id,
    dateTime,
    status: { $ne: "Cancelled" },
  });

  if (slotTaken) return fail("This time slot is already booked.", 409);

  return {
    value: {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || null,
      dateOfBirth,
      gender,
      clinicId: String(clinic._id),
      clinicName: clinic.name,
      date,
      time,
    },
  };
}

// POST /api/campaigns/:id/book/request-otp  (public)
// Step 1: validate the form and email a 6-digit code. Nothing is booked yet.
exports.requestBookingOtp = async (req, res) => {
  try {
    if (limited(req.ip || "unknown")) {
      return res
        .status(429)
        .json({ message: "Too many attempts. Please try again later." });
    }

    const campaign = await loadBookableCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or ended." });
    }

    const { error, value } = await validateGuestBooking(campaign, req.body);

    if (error) return res.status(error.status).json({ message: error.message });

    const code = crypto.randomInt(100000, 1000000).toString();

    await OTP.deleteMany({ email: value.email, purpose: "guest-booking" });
    await OTP.create({
      email: value.email,
      otp: code,
      purpose: "guest-booking",
      expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000),
      payload: { campaignId: String(campaign._id), ...value },
    });

    await sendGuestOtpEmail(value.email, code, "guest-booking");

    return res.json({
      message: `We sent a 6-digit code to ${value.email}.`,
    });
  } catch (error) {
    console.error("Campaign OTP request error:", error);
    return res
      .status(500)
      .json({ message: "Could not send the verification code. Try again." });
  }
};

// POST /api/campaigns/:id/book/confirm  (public)
// Step 2: check the code, then create the profile + appointment + Appointment ID.
exports.confirmBooking = async (req, res) => {
  try {
    if (limited(req.ip || "unknown")) {
      return res
        .status(429)
        .json({ message: "Too many attempts. Please try again later." });
    }

    const campaign = await loadBookableCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or ended." });
    }

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const code = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const record = await OTP.findOne({ email, purpose: "guest-booking" });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({
        message: "This code has expired. Please go back and request a new one.",
      });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({
        message: "Too many wrong codes. Please request a new one.",
      });
    }

    if (record.otp !== code) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "That code is not correct." });
    }

    const pending = record.payload;

    if (!pending || pending.campaignId !== String(campaign._id)) {
      return res
        .status(400)
        .json({ message: "Please start your booking again." });
    }

    // Re-check availability: the slot may have been taken while the guest
    // was reading their email.
    const { error, value } = await validateGuestBooking(campaign, pending);

    if (error) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(error.status).json({ message: error.message });
    }

    const profile = await GuestProfile.create({
      name: value.name,
      email: value.email,
      phone: value.phone,
      dateOfBirth: new Date(`${value.dateOfBirth}T00:00:00+06:00`),
      gender: value.gender,
    });

    const dateTime = parseAppointmentDateTime(value.date, value.time);
    const worker = await selectVaccinationWorker(value.clinicId, value.date);

    let appointment = null;

    for (let attempt = 0; attempt < 5 && !appointment; attempt += 1) {
      try {
        appointment = await Appointment.create({
          citizenId: null,
          campaignId: campaign._id,
          guestProfileId: profile._id,
          bookingCode: makeBookingCode(),
          clinicId: value.clinicId,
          vaccineId: campaign.vaccineId._id,
          doseNumber: campaign.doseNumber || 1,
          dateTime,
          assignedWorkerId: worker?._id || null,
          status: "Confirmed",
        });
      } catch (createError) {
        // Duplicate booking code: try another one.
        if (createError.code !== 11000) throw createError;
      }
    }

    if (!appointment) {
      await GuestProfile.deleteOne({ _id: profile._id });
      return res.status(500).json({ message: "Could not create the booking." });
    }

    await OTP.deleteOne({ _id: record._id });

    const summary = {
      name: value.name,
      email: value.email,
      bookingCode: appointment.bookingCode,
      campaign: campaign.title,
      vaccine: campaign.vaccineId.name,
      clinic: value.clinicName,
      when: formatDisplayDateTime(dateTime),
    };

    // A failed email must not undo a successful booking.
    sendGuestBookingEmail(value.email, summary).catch((emailError) =>
      console.error("Guest booking email error:", emailError.message)
    );

    return res.status(201).json({
      message: "Your appointment is confirmed.",
      appointmentId: appointment._id,
      summary,
    });
  } catch (error) {
    console.error("Campaign booking confirm error:", error);
    return res.status(500).json({ message: "Failed to book appointment." });
  }
};

// POST /api/campaigns  (admin)
exports.createCampaign = async (req, res) => {
  try {
    const { title, description, vaccineId, doseNumber, clinicIds, startDate, endDate } =
      req.body || {};

    if (!title || !vaccineId || !startDate || !endDate) {
      return res.status(400).json({
        message: "Title, vaccine, start date and end date are required.",
      });
    }

    if (!mongoose.isValidObjectId(vaccineId)) {
      return res.status(400).json({ message: "Invalid vaccine." });
    }

    if (!isRealDate(startDate) || !isRealDate(endDate) || endDate < startDate) {
      return res.status(400).json({
        message: "Dates must be valid and the end date cannot be before the start date.",
      });
    }

    if (endDate < getLocalDateString()) {
      return res.status(400).json({ message: "The end date cannot be in the past." });
    }

    const vaccine = await Vaccine.findOne({ _id: vaccineId, isActive: true });

    if (!vaccine) {
      return res.status(404).json({ message: "Active vaccine not found." });
    }

    const dose = Number(doseNumber || 1);

    if (!Number.isInteger(dose) || dose < 1) {
      return res.status(400).json({ message: "Dose number must be a positive whole number." });
    }

    const ids = Array.isArray(clinicIds)
      ? clinicIds.filter((id) => mongoose.isValidObjectId(id))
      : [];

    const campaign = await Campaign.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      vaccineId,
      doseNumber: dose,
      clinicIds: ids,
      startDate,
      endDate,
      createdBy: req.user._id,
    });

    return res.status(201).json({ message: "Campaign published.", campaign });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Create campaign error:", error);
    return res.status(500).json({ message: "Failed to create campaign." });
  }
};

// GET /api/campaigns  (admin)
exports.listCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate("vaccineId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ campaigns });
  } catch (error) {
    console.error("List campaigns error:", error.message);
    return res.status(500).json({ message: "Failed to fetch campaigns." });
  }
};

// PATCH /api/campaigns/:id/deactivate  (admin)
exports.deactivateCampaign = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid campaign." });
    }

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { returnDocument: "after" }
    );

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found." });
    }

    return res.json({ message: "Campaign ended.", campaign });
  } catch (error) {
    console.error("Deactivate campaign error:", error.message);
    return res.status(500).json({ message: "Failed to end campaign." });
  }
};
