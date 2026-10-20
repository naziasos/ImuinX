const mongoose = require("mongoose");

const User = require("../models/User");
const FamilyProfile = require("../models/FamilyProfile");
const Vaccine = require("../models/Vaccine");
const VaccineSchedule = require("../models/VaccineSchedule");
const DoseRecord = require("../models/DoseRecord");
const Appointment = require("../models/Appointment");
const CatchUpSchedule = require("../models/CatchUpSchedule");
const Notification = require("../models/Notification");

const ACTIVE_APPOINTMENT_STATUSES = ["Pending", "Confirmed"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + Number(days));
  return result;
}

function calendarDateKey(date) {
  const timeZone = process.env.APP_TIMEZONE || "Asia/Dhaka";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function isDue(dueDate, now) {
  return dueDate instanceof Date &&
    !Number.isNaN(dueDate.getTime()) &&
    calendarDateKey(dueDate) < calendarDateKey(now);
}

function isDuplicateKey(error) {
  return error && error.code === 11000;
}

function matchesVaccine(record, vaccine) {
  const value = normalize(record.vaccineType);
  return value === normalize(vaccine.name) ||
    value === normalize(vaccine.code);
}

function profileAppointmentFilter(profile) {
  if (profile.profileType === "FamilyProfile") {
    return {
      citizenId: profile.guardianId,
      familyProfileId: profile.profileId,
    };
  }

  return {
    citizenId: profile.profileId,
    familyProfileId: null,
  };
}

async function getCompletedDoseNumbers(profile, vaccine, records) {
  const matchingRecords = records.filter((record) =>
    matchesVaccine(record, vaccine)
  );

  const numbers = new Set(
    matchingRecords
      .filter((record) => Number.isInteger(record.doseNumber))
      .map((record) => record.doseNumber)
  );

  // Older DoseRecord documents may not have doseNumber. For those,
  // use the linked completed appointment's doseNumber as a safe fallback.
  const linkedIds = matchingRecords
    .filter((record) => !record.doseNumber && record.appointmentId)
    .map((record) => record.appointmentId);

  if (linkedIds.length) {
    const linkedAppointments = await Appointment.find({
      _id: { $in: linkedIds },
      status: "Completed",
      vaccineId: vaccine._id,
      ...profileAppointmentFilter(profile),
    }).select("_id doseNumber");

    const appointmentDoseById = new Map(
      linkedAppointments.map((appointment) => [
        String(appointment._id),
        appointment.doseNumber,
      ])
    );

    for (const record of matchingRecords) {
      const number = record.appointmentId
        ? appointmentDoseById.get(String(record.appointmentId))
        : null;
      if (Number.isInteger(number)) numbers.add(number);
    }
  }

  return numbers;
}

async function hasActiveAppointment(profile, vaccineId, doseNumber) {
  const appointment = await Appointment.findOne({
    ...profileAppointmentFilter(profile),
    vaccineId,
    doseNumber,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
  }).select("_id");

  return Boolean(appointment);
}

async function upsertMissedDose(profile, schedule, vaccine, doseRule, dueDate, now) {
  const filter = {
    profileId: profile.profileId,
    profileType: profile.profileType,
    vaccineId: vaccine._id,
    doseNumber: doseRule.doseNumber,
    originalDueDate: dueDate,
  };

  let catchUp;
  try {
    catchUp = await CatchUpSchedule.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          guardianId: profile.guardianId,
          ...filter,
          missedAt: now,
          status: "Missed",
          sourceRuleId: schedule._id,
          guidelineVersion: schedule.guidelineVersion || null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    // Another job instance may have inserted the same unique recovery row.
    if (!isDuplicateKey(error)) throw error;
    catchUp = await CatchUpSchedule.findOne(filter);
  }

  if (!catchUp) return { created: false, reason: "not-found" };

  // Do not notify again for a recovery that has already been closed.
  if (["Completed", "Cancelled", "Superseded"].includes(catchUp.status)) {
    return { created: false, reason: "closed" };
  }

  // A stable key makes notification creation idempotent, including when a
  // process crashes after creating CatchUpSchedule but before the notification.
  const dedupeKey = `missed-dose:${catchUp._id}`;
  try {
    await Notification.updateOne(
      { dedupeKey },
      {
        $setOnInsert: {
          userId: profile.guardianId,
          type: "missed_dose",
          message: `${vaccine.name} dose ${doseRule.doseNumber} is overdue. Please arrange a catch-up vaccination.`,
          referenceId: catchUp._id,
          dedupeKey,
          isRead: false,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Concurrent job instances can race on the unique dedupe key.
    if (!isDuplicateKey(error)) throw error;
  }

  return { created: true, catchUpId: catchUp._id };
}

/**
 * Detect overdue doses using only active, approved vaccine schedules.
 *
 * Dose 1 due date = date of birth + schedule.minAgeDays.
 * Later dose due date = previous scheduled dose's administration date +
 * the current dose rule's minIntervalDays. If the required previous dose
 * or interval is missing, the job skips that dose rather than guessing.
 */
async function detectMissedDoses(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const summary = {
    profilesChecked: 0,
    dosesChecked: 0,
    missedRecordsEnsured: 0,
    skippedActiveAppointment: 0,
    skippedCompletedDose: 0,
    skippedNoDueDate: 0,
    errors: 0,
  };

  const [users, familyProfiles, schedules] = await Promise.all([
    User.find({
      role: "citizen",
      dateOfBirth: { $ne: null },
    }).select("_id dateOfBirth"),
    FamilyProfile.find({
      dateOfBirth: { $ne: null },
    }).select("_id guardianId dateOfBirth"),
    VaccineSchedule.find({
      isActive: true,
      isApproved: true,
    }).populate("vaccineId", "name code isActive"),
  ]);

  const profiles = [
    ...users.map((user) => ({
      profileId: user._id,
      profileType: "User",
      guardianId: user._id,
      dateOfBirth: user.dateOfBirth,
    })),
    ...familyProfiles.map((profile) => ({
      profileId: profile._id,
      profileType: "FamilyProfile",
      guardianId: profile.guardianId,
      dateOfBirth: profile.dateOfBirth,
    })),
  ];

  for (const profile of profiles) {
    summary.profilesChecked += 1;

    if (!profile.guardianId || !profile.dateOfBirth) continue;

    const records = await DoseRecord.find({
      citizenId: profile.profileId,
      citizenType: profile.profileType,
    }).select("vaccineType doseNumber dateAdministered appointmentId");

    for (const schedule of schedules) {
      const vaccine = schedule.vaccineId;
      if (!vaccine || vaccine.isActive === false) continue;

      const completedDoseNumbers = await getCompletedDoseNumbers(
        profile,
        vaccine,
        records
      );

      const sortedRules = [...schedule.doses].sort(
        (a, b) => a.doseNumber - b.doseNumber
      );

      for (let index = 0; index < sortedRules.length; index += 1) {
        const doseRule = sortedRules[index];
        summary.dosesChecked += 1;

        if (completedDoseNumbers.has(doseRule.doseNumber)) {
          summary.skippedCompletedDose += 1;
          continue;
        }

        let dueDate = null;

        if (doseRule.doseNumber === 1) {
          dueDate = addDays(profile.dateOfBirth, schedule.minAgeDays);
        } else {
          const previousRule = sortedRules[index - 1];
          if (!previousRule) {
            summary.skippedNoDueDate += 1;
            continue;
          }
          const previousDose = records
            .filter((record) => matchesVaccine(record, vaccine))
            .filter((record) => {
              if (record.doseNumber === previousRule.doseNumber) return true;
              // Older records can be matched through a completed appointment.
              return false;
            })
            .sort((a, b) => new Date(a.dateAdministered) - new Date(b.dateAdministered))[0];

          let previousDoseDate = previousDose?.dateAdministered || null;

          if (!previousDoseDate) {
            const legacyRecords = records.filter(
              (record) =>
                matchesVaccine(record, vaccine) &&
                !record.doseNumber &&
                record.appointmentId
            );

            if (legacyRecords.length) {
              const legacyAppointments = await Appointment.find({
                _id: {
                  $in: legacyRecords.map((record) => record.appointmentId),
                },
                status: "Completed",
                vaccineId: vaccine._id,
                doseNumber: previousRule.doseNumber,
                ...profileAppointmentFilter(profile),
              }).select("_id");

              const validAppointmentIds = new Set(
                legacyAppointments.map((appointment) => String(appointment._id))
              );
              const matchingLegacyRecord = legacyRecords
                .filter((record) =>
                  validAppointmentIds.has(String(record.appointmentId))
                )
                .sort(
                  (a, b) =>
                    new Date(a.dateAdministered) -
                    new Date(b.dateAdministered)
                )[0];

              if (matchingLegacyRecord) {
                previousDoseDate = matchingLegacyRecord.dateAdministered;
              }
            }
          }

          if (
            !previousDoseDate ||
            doseRule.minIntervalDays === null ||
            doseRule.minIntervalDays === undefined
          ) {
            summary.skippedNoDueDate += 1;
            continue;
          }

          dueDate = addDays(previousDoseDate, doseRule.minIntervalDays);
        }

        if (!isDue(dueDate, now)) continue;

        if (await hasActiveAppointment(profile, vaccine._id, doseRule.doseNumber)) {
          summary.skippedActiveAppointment += 1;
          continue;
        }

        const result = await upsertMissedDose(
          profile,
          schedule,
          vaccine,
          doseRule,
          dueDate,
          now
        );

        if (result.created) summary.missedRecordsEnsured += 1;
      }
    }
  }

  return summary;
}

async function runMissedDoseDetectionJob() {
  try {
    const summary = await detectMissedDoses();
    console.log("Missed-dose detection completed:", summary);
    return summary;
  } catch (error) {
    console.error("Missed-dose detection failed:", error);
    throw error;
  }
}

module.exports = runMissedDoseDetectionJob;
module.exports.detectMissedDoses = detectMissedDoses;
module.exports.hasActiveAppointment = hasActiveAppointment;
module.exports.getCompletedDoseNumbers = getCompletedDoseNumbers;

module.exports.addDays = addDays;
module.exports.isDue = isDue;
module.exports.calendarDateKey = calendarDateKey;
module.exports.matchesVaccine = matchesVaccine;
