const Feedback = require("../models/Feedback");
const Appointment = require("../models/Appointment");
const InHouseRequest = require("../models/InHouseRequest");

/*
|--------------------------------------------------------------------------
| FEEDBACK COOLDOWN RULE
|--------------------------------------------------------------------------
| After a citizen SUBMITS feedback, the next appointment / in-house
| feedback prompt is only created once, since that submission, the citizen has
|   - booked 2 more appointments, OR
|   - made 1 more in-house request.
| Whichever happens first. Change the two numbers (or set REQUIRE_BOTH to
| true to demand both) to tune it.
|
| A citizen who has never submitted feedback is prompted right away.
| Vaccination feedback (created when a dose is logged) is not affected.
*/
const APPOINTMENTS_BETWEEN_FEEDBACK = 2;
const IN_HOUSE_BETWEEN_FEEDBACK = 1;
const REQUIRE_BOTH = false;

const BOOKING_TYPES = ["Appointment", "InHouse"];

function isDuplicateKey(error) {
  return error && error.code === 11000;
}

/**
 * Has the citizen done enough since their last submitted feedback?
 */
async function isEligibleForNewPrompt(userId, feedbackType) {
  // An unanswered prompt of the SAME kind is still waiting -> don't stack
  // another. (A pending appointment prompt must not block an in-house one.)
  const waiting = await Feedback.exists({
    userId,
    feedbackType: feedbackType || { $in: BOOKING_TYPES },
    promptStatus: "Pending",
  });
  if (waiting) return false;

  const last = await Feedback.findOne({
    userId,
    promptStatus: "Submitted",
  })
    .sort({ submittedAt: -1 })
    .select("submittedAt");

  // Never gave feedback before -> ask now
  if (!last || !last.submittedAt) return true;

  const since = last.submittedAt;

  const [appointments, inHouse] = await Promise.all([
    Appointment.countDocuments({
      citizenId: userId,
      status: { $ne: "Cancelled" },
      createdAt: { $gt: since },
    }),
    InHouseRequest.countDocuments({
      citizen: userId,
      status: { $ne: "Cancelled" },
      createdAt: { $gt: since },
    }),
  ]);

  const enoughAppointments = appointments >= APPOINTMENTS_BETWEEN_FEEDBACK;
  const enoughInHouse = inHouse >= IN_HOUSE_BETWEEN_FEEDBACK;

  return REQUIRE_BOTH
    ? enoughAppointments && enoughInHouse
    : enoughAppointments || enoughInHouse;
}

async function createOnce(filter, doc) {
  try {
    return await Feedback.findOneAndUpdate(
      filter,
      { $setOnInsert: { ...filter, ...doc, promptStatus: "Pending" } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Two requests raced on the unique index: the other one won, use it
    if (isDuplicateKey(error)) {
      const found = await Feedback.findOne(filter);
      if (!found) {
        console.error(
          "Feedback prompt blocked by an old unique index on doseRecordId. " +
            "Restart the server (index is fixed on startup) or run " +
            "node scripts/migrateFeedbackIndexes.js"
        );
      }
      return found;
    }
    throw error;
  }
}

/**
 * Call right after an appointment is booked.
 * Returns the Pending feedback, or null when the cooldown says "not yet".
 * Never throws: feedback must not break a successful booking.
 */
async function promptAfterAppointment(appointment, vaccineName) {
  try {
    const userId = appointment.citizenId;

    // Already has a prompt for this appointment
    const existing = await Feedback.findOne({
      feedbackType: "Appointment",
      appointmentId: appointment._id,
    });
    if (existing) return existing;

    if (!(await isEligibleForNewPrompt(userId, "Appointment"))) return null;

    return await createOnce(
      { feedbackType: "Appointment", appointmentId: appointment._id },
      {
        clinicId: appointment.clinicId,
        userId,
        citizenId: appointment.familyProfileId || userId,
        citizenType: appointment.familyProfileId ? "FamilyProfile" : "User",
        vaccineType: vaccineName || "Appointment booking",
      }
    );
  } catch (error) {
    console.error("Appointment feedback prompt failed:", error);
    return null;
  }
}

/**
 * Call right after an in-house request is created.
 */
async function promptAfterInHouseRequest(request) {
  try {
    const userId = request.citizen;

    const existing = await Feedback.findOne({
      feedbackType: "InHouse",
      inHouseRequestId: request._id,
    });
    if (existing) return existing;

    if (!(await isEligibleForNewPrompt(userId, "InHouse"))) return null;

    return await createOnce(
      { feedbackType: "InHouse", inHouseRequestId: request._id },
      {
        clinicId: null, // set when a worker accepts the request
        userId,
        citizenId: request.familyMember || userId,
        citizenType: request.familyMember ? "FamilyProfile" : "User",
        vaccineType: request.vaccineOrReason || "In-house visit",
      }
    );
  } catch (error) {
    console.error("In-house feedback prompt failed:", error);
    return null;
  }
}

/**
 * Call when a worker accepts an in-house request so the clinic's dashboard
 * can see the feedback. clinicId is immutable, hence overwriteImmutable.
 */
async function attachClinicToInHouseFeedback(requestId, clinicId) {
  if (!clinicId) return;
  try {
    await Feedback.updateOne(
      { feedbackType: "InHouse", inHouseRequestId: requestId, clinicId: null },
      { $set: { clinicId } },
      { overwriteImmutable: true }
    );
  } catch (error) {
    console.error("Attach clinic to in-house feedback failed:", error);
  }
}

/**
 * Run once after the DB connects. Older databases have a plain unique index
 * on doseRecordId that rejects a 2nd appointment/in-house feedback (both have
 * no dose). Replace it with the partial index the model now declares.
 */
async function ensureFeedbackIndexes() {
  try {
    await Feedback.updateMany(
      { feedbackType: { $exists: false } },
      { $set: { feedbackType: "Vaccination", inHouseRequestId: null } }
    );

    const indexes = await Feedback.collection.indexes();
    const legacy = indexes.find(
      (i) => i.name === "doseRecordId_1" && !i.partialFilterExpression
    );
    if (legacy) {
      await Feedback.collection.dropIndex("doseRecordId_1");
      console.log("Dropped legacy doseRecordId_1 feedback index");
    }
    await Feedback.syncIndexes();
  } catch (error) {
    console.error("Feedback index check failed:", error.message);
  }
}

function toPromptSummary(feedback) {
  return feedback
    ? {
        id: feedback._id,
        feedbackType: feedback.feedbackType,
        promptStatus: feedback.promptStatus,
      }
    : null;
}

module.exports = {
  APPOINTMENTS_BETWEEN_FEEDBACK,
  IN_HOUSE_BETWEEN_FEEDBACK,
  isEligibleForNewPrompt,
  promptAfterAppointment,
  promptAfterInHouseRequest,
  attachClinicToInHouseFeedback,
  ensureFeedbackIndexes,
  toPromptSummary,
};
