const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const CatchUpSchedule = require("../models/CatchUpSchedule");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");
const VaccineSchedule = require("../models/VaccineSchedule");
const DoseRecord = require("../models/DoseRecord");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");

const router = express.Router();

const REASONS = [
  "travel",
  "sick",
  "stock_unavailable",
  "appointment_issue",
  "forgot",
  "access_issue",
  "other",
];

function validId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function startOfToday() {
  const timeZone = process.env.APP_TIMEZONE || "Asia/Dhaka";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

async function canAccessRecovery(recovery, userId) {
  if (String(recovery.guardianId) === String(userId)) return true;

  // For older recovery records, verify ownership from the family profile.
  if (recovery.profileType === "FamilyProfile") {
    const profile = await FamilyProfile.findById(recovery.profileId).select("guardianId");
    return Boolean(profile && String(profile.guardianId) === String(userId));
  }
  return false;
}

async function loadOwnedRecovery(req, res) {
  const recoveryId = req.params.recoveryId;
  if (!validId(recoveryId)) {
    res.status(400).json({ message: "Invalid recovery schedule ID." });
    return null;
  }

  const recovery = await CatchUpSchedule.findById(recoveryId);
  if (!recovery) {
    res.status(404).json({ message: "Recovery schedule not found." });
    return null;
  }

  if (!(await canAccessRecovery(recovery, req.user._id))) {
    res.status(403).json({ message: "You are not allowed to access this recovery schedule." });
    return null;
  }
  return recovery;
}

function isDuplicateKey(error) {
  return Boolean(error && error.code === 11000);
}

// Notifications are idempotent: the unique dedupeKey index in Notification.js
// prevents duplicate rows if an API request is retried or concurrent requests race.
async function notifyRecovery({ recovery, type, dedupeKey, message }) {
  try {
    await Notification.updateOne(
      { dedupeKey },
      {
        $setOnInsert: {
          userId: recovery.guardianId,
          type,
          message,
          referenceId: recovery._id,
          dedupeKey,
          isRead: false,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }
}

async function markReviewRequired(recovery, reason) {
  recovery.status = "ReviewRequired";
  recovery.suggestedDueDate = null;
  recovery.scheduleGeneratedAt = null;
  await recovery.save();

  // Stable key means retries can repair a missed notification without duplicates.
  await notifyRecovery({
    recovery,
    type: "recovery_review_required",
    dedupeKey: `recovery-review-required:${recovery._id}`,
    message: `Your catch-up vaccination needs clinical review. ${reason}`,
  });

  return {
    status: "ReviewRequired",
    suggestedDueDate: null,
    message: reason,
    recovery,
  };
}

// List the signed-in guardian/citizen's recovery schedules.
router.get("/", authMiddleware, async (req, res) => {
  try {
    const schedules = await CatchUpSchedule.find({
      guardianId: req.user._id,
    })
      .populate("vaccineId", "name code")
      .populate("profileId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ schedules });
  } catch (error) {
    console.error("Get recovery schedules error:", error);

    return res.status(500).json({
      message: "Could not load recovery schedules.",
    });
  }
});

// Fetch one recovery record from a notification's referenceId.
// Ownership is checked the same way as reason/schedule mutations.
router.get("/:recoveryId", authMiddleware, async (req, res) => {
  try {
    const recovery = await loadOwnedRecovery(req, res);
    if (!recovery) return;

    await recovery.populate([
      { path: "vaccineId", select: "name code" },
      { path: "profileId", select: "name" },
    ]);

    return res.status(200).json({ schedule: recovery });
  } catch (error) {
    console.error("Get recovery schedule detail error:", error);
    return res.status(500).json({
      message: "Could not load recovery schedule details.",
    });
  }
});

// API part 1: report/update the reason for a missed dose.
router.patch("/:recoveryId/reason", authMiddleware, async (req, res) => {
  try {
    const recovery = await loadOwnedRecovery(req, res);
    if (!recovery) return;

    const reasonCode = String(req.body.reasonCode || "").trim();
    const reasonDetails = String(req.body.reasonDetails || "").trim();

    if (!REASONS.includes(reasonCode)) {
      return res.status(400).json({
        message: "A valid reasonCode is required.",
        allowedReasons: REASONS,
      });
    }
    if (reasonDetails.length > 500) {
      return res.status(400).json({ message: "Reason details must be 500 characters or fewer." });
    }
    if (reasonCode === "other" && !reasonDetails) {
      return res.status(400).json({ message: "Please describe the reason when selecting 'other'." });
    }
    if (["Completed", "Cancelled", "Superseded"].includes(recovery.status)) {
      return res.status(409).json({ message: "This recovery schedule is closed and cannot be changed." });
    }

    recovery.reasonCode = reasonCode;
    recovery.reasonDetails = reasonDetails;
    recovery.reportedBy = req.user._id;
    recovery.reportedAt = new Date();
    if (!["ScheduleReady", "AppointmentBooked"].includes(recovery.status)) {
      recovery.status = "ReasonProvided";
    }
    await recovery.save();

    // Re-run the idempotent upsert even on retries: this repairs the case
    // where the reason was saved but the process stopped before notifying.
    await notifyRecovery({
      recovery,
      type: "recovery_reason_submitted",
      dedupeKey: `recovery-reason-submitted:${recovery._id}`,
      message: "Your missed-dose recovery reason has been submitted.",
    });

    return res.json({
      message: "Recovery reason saved.",
      schedule: recovery,
    });
  } catch (error) {
    console.error("Recovery reason error:", error);
    return res.status(500).json({ message: "Could not save the recovery reason." });
  }
});

// API part 2: create a suggested date using an approved rule and actual dose history.
// It deliberately returns ReviewRequired instead of inventing a medical interval.
router.post("/:recoveryId/generate-schedule", authMiddleware, async (req, res) => {
  try {
    const recovery = await loadOwnedRecovery(req, res);
    if (!recovery) return;

    if (["Completed", "Cancelled", "Superseded"].includes(recovery.status)) {
      return res.status(409).json({ message: "This recovery schedule is closed." });
    }

    // Idempotent: a previously generated valid schedule is returned unchanged.
    if (recovery.status === "ScheduleReady" && recovery.suggestedDueDate) {
      // Idempotent notification upsert also repairs a prior interrupted request.
      await notifyRecovery({
        recovery,
        type: "catch_up_schedule_ready",
        dedupeKey: `catch-up-schedule-ready:${recovery._id}`,
        message: "Your catch-up vaccination schedule is ready. Please review the suggested date.",
      });
      return res.json({
        message: "Existing catch-up schedule returned.",
        status: recovery.status,
        suggestedDueDate: recovery.suggestedDueDate,
        schedule: recovery,
        reused: true,
      });
    }

    const approvedSchedules = await VaccineSchedule.find({
      vaccineId: recovery.vaccineId,
      isActive: true,
      isApproved: true,
    }).sort({ updatedAt: -1 });

    const approved = approvedSchedules.find((item) =>
      item.doses.some((dose) => dose.doseNumber === recovery.doseNumber)
    );

    if (!approved || !approved.guidelineSource ||
        ["", "Unverified", "unverified"].includes(String(approved.guidelineSource).trim())) {
      const result = await markReviewRequired(
        recovery,
        "No approved, verifiable vaccine rule was found. A clinician must review this case."
      );
      return res.status(200).json(result);
    }

    const targetRule = approved.doses.find(
      (dose) => dose.doseNumber === recovery.doseNumber
    );
    let earliestAllowedDate;

    if (recovery.doseNumber === 1) {
      // Dose 1 uses the approved minimum-age rule and the actual profile DOB.
      let dateOfBirth;
      if (recovery.profileType === "FamilyProfile") {
        const profile = await FamilyProfile.findOne({
          _id: recovery.profileId, guardianId: req.user._id,
        }).select("dateOfBirth");
        dateOfBirth = profile && profile.dateOfBirth;
      } else {
        const user = await User.findById(recovery.profileId).select("dateOfBirth");
        dateOfBirth = user && user.dateOfBirth;
      }
      if (!dateOfBirth || !Number.isInteger(approved.minAgeDays)) {
        const result = await markReviewRequired(
          recovery,
          "Date of birth or approved minimum-age rule is missing. Clinical review is required."
        );
        return res.status(200).json(result);
      }
      earliestAllowedDate = addDays(dateOfBirth, approved.minAgeDays);
    } else {
      if (!Number.isInteger(targetRule.minIntervalDays) || targetRule.minIntervalDays < 0) {
        const result = await markReviewRequired(
          recovery,
          "The approved minimum interval for this dose is missing. Clinical review is required."
        );
        return res.status(200).json(result);
      }

      const previousDoseNumber = recovery.doseNumber - 1;
      const previousRuleExists = approved.doses.some(
        (dose) => dose.doseNumber === previousDoseNumber
      );
      if (!previousRuleExists) {
        const result = await markReviewRequired(
          recovery,
          "The previous dose rule is missing. Clinical review is required."
        );
        return res.status(200).json(result);
      }

      const vaccine = await require("../models/Vaccine").findById(recovery.vaccineId)
        .select("name code");
      if (!vaccine) {
        const result = await markReviewRequired(recovery, "Vaccine details are missing.");
        return res.status(200).json(result);
      }

      // Prefer a dose record explicitly marked with the previous dose number.
      let previousDose = await DoseRecord.findOne({
        citizenId: recovery.profileId,
        citizenType: recovery.profileType,
        doseNumber: previousDoseNumber,
        vaccineType: { $in: [vaccine.name, vaccine.code].filter(Boolean) },
      }).sort({ dateAdministered: -1 });

      // Legacy records without doseNumber can only be matched via a completed
      // appointment for the same person/vaccine/dose; never guess from any record.
      if (!previousDose) {
        const legacyRecords = await DoseRecord.find({
          citizenId: recovery.profileId,
          citizenType: recovery.profileType,
          doseNumber: null,
          vaccineType: { $in: [vaccine.name, vaccine.code].filter(Boolean) },
          appointmentId: { $ne: null },
        }).sort({ dateAdministered: -1 });

        for (const record of legacyRecords) {
          const appointment = await Appointment.findOne({
            _id: record.appointmentId,
            status: "Completed",
            vaccineId: recovery.vaccineId,
            doseNumber: previousDoseNumber,
            citizenId: recovery.guardianId,
            familyProfileId: recovery.profileType === "FamilyProfile"
              ? recovery.profileId : null,
          }).select("_id");
          if (appointment) {
            previousDose = record;
            break;
          }
        }
      }

      if (!previousDose || !previousDose.dateAdministered) {
        const result = await markReviewRequired(
          recovery,
          "Verified previous-dose history is missing. Clinical review is required."
        );
        return res.status(200).json(result);
      }

      earliestAllowedDate = addDays(
        previousDose.dateAdministered,
        targetRule.minIntervalDays
      );
    }

    // Never suggest a date in the past. For later doses, this also guarantees
    // the date is at least previous-dose date + the approved minimum interval.
    const today = startOfToday();
    const originalDueDate = new Date(recovery.originalDueDate);
    const candidates = [earliestAllowedDate, today, originalDueDate]
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));
    const suggestedDueDate = new Date(Math.max(...candidates.map((date) => date.getTime())));

    recovery.suggestedDueDate = suggestedDueDate;
    recovery.sourceRuleId = approved._id;
    recovery.guidelineVersion = approved.guidelineVersion || null;
    recovery.scheduleGeneratedAt = new Date();
    recovery.status = "ScheduleReady";
    await recovery.save();

    await notifyRecovery({
      recovery,
      type: "catch_up_schedule_ready",
      dedupeKey: `catch-up-schedule-ready:${recovery._id}`,
      message: "Your catch-up vaccination schedule is ready. Please review the suggested date.",
    });

    return res.json({
      message: "Catch-up schedule generated and saved.",
      status: recovery.status,
      suggestedDueDate: recovery.suggestedDueDate,
      schedule: recovery,
      reused: false,
      rule: {
        source: approved.guidelineSource,
        version: approved.guidelineVersion || null,
        minIntervalDays: recovery.doseNumber === 1 ? null : targetRule.minIntervalDays,
      },
    });
  } catch (error) {
    console.error("Catch-up schedule generation error:", error);
    return res.status(500).json({ message: "Could not generate the catch-up schedule." });
  }
});

module.exports = router;
