const mongoose = require("mongoose");

// Staff/admin reply to a feedback entry (embedded; a thread is small)
const responseSchema = new mongoose.Schema(
  {
    responderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    responderRole: {
      type: String,
      enum: ["worker", "clinicAdmin", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const FEEDBACK_TYPES = ["Vaccination", "Appointment", "InHouse"];

const feedbackSchema = new mongoose.Schema(
  {
    // What this feedback is about:
    //   Vaccination = a completed dose / new certificate (original flow)
    //   Appointment = the citizen just booked an appointment
    //   InHouse     = the citizen just requested an in-house visit
    feedbackType: {
      type: String,
      enum: FEEDBACK_TYPES,
      default: "Vaccination",
      immutable: true,
    },

    // ---- Links ----
    // Vaccination: copied from the completed dose
    doseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoseRecord",
      default: null,
      immutable: true,
      required: function () {
        return this.feedbackType === "Vaccination";
      },
    },

    // Vaccination: appointment the dose came from (optional)
    // Appointment: the booked appointment
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
      immutable: true,
    },

    // InHouse only
    inHouseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InHouseRequest",
      default: null,
      immutable: true,
      required: function () {
        return this.feedbackType === "InHouse";
      },
    },

    // An in-house request has no clinic until a worker accepts it, so
    // clinicId is only required for the other two types. It is filled in
    // by feedbackPromptService.attachClinicToInHouseFeedback().
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      default: null,
      immutable: true,
      required: function () {
        return this.feedbackType !== "InHouse";
      },
    },

    // The logged-in citizen/guardian who gives the feedback
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    // Who was vaccinated (same pattern as DoseRecord / Certificate)
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "citizenType",
      required: true,
      immutable: true,
    },

    citizenType: {
      type: String,
      required: true,
      enum: ["User", "FamilyProfile"],
      immutable: true,
    },

    // Snapshot so the clinic dashboard needs no join to DoseRecord
    vaccineType: {
      type: String,
      required: true,
      trim: true,
    },

    // ---- Popup / "Maybe Later" lifecycle ----
    // Pending   = created on dose completion, not answered yet
    // Submitted = rating saved
    promptStatus: {
      type: String,
      enum: ["Pending", "Submitted"],
      default: "Pending",
    },

    // How many times the user tapped "Maybe Later"
    dismissCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastDismissedAt: {
      type: Date,
      default: null,
    },

    // ---- Feedback content (null until submitted) ----
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
      validate: {
        validator: (v) => v === null || Number.isInteger(v),
        message: "Rating must be a whole number from 1 to 5",
      },
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    tags: {
      type: [String],
      enum: [
        "Staff Behavior",
        "Waiting Time",
        "Cleanliness",
        "Process",
        "Information",
        "Other",
      ],
      default: [],
    },

    // If true, the clinic sees "Anonymous" instead of the user's name
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    // ---- Clinic dashboard / response workflow ----
    reviewStatus: {
      type: String,
      enum: ["New", "Responded", "Resolved"],
      default: "New",
    },

    responses: {
      type: [responseSchema],
      default: [],
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One feedback per dose -> prevents duplicates / double submit.
// Partial: Appointment / InHouse feedback has no dose, and a plain unique
// index would treat all those missing values as duplicates of each other.
feedbackSchema.index(
  { doseRecordId: 1 },
  {
    unique: true,
    partialFilterExpression: { doseRecordId: { $type: "objectId" } },
  }
);

// One feedback per booked appointment
feedbackSchema.index(
  { appointmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { feedbackType: "Appointment" },
  }
);

// One feedback per in-house request
feedbackSchema.index(
  { inHouseRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { inHouseRequestId: { $type: "objectId" } },
  }
);

// Citizen dashboard: "my pending feedback" for the Give Feedback button
feedbackSchema.index({ userId: 1, promptStatus: 1, createdAt: -1 });

// Clinic dashboard: list + filter by status, newest first
feedbackSchema.index({
  clinicId: 1,
  promptStatus: 1,
  reviewStatus: 1,
  submittedAt: -1,
});

// Clinic average rating / rating filter
feedbackSchema.index({ clinicId: 1, rating: 1 });

// A submitted entry must have a rating
feedbackSchema.pre("validate", function () {
  if (this.promptStatus === "Submitted" && this.rating == null) {
    this.invalidate("rating", "Rating is required to submit feedback");
  }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
module.exports.FEEDBACK_TYPES = FEEDBACK_TYPES;