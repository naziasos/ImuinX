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

const feedbackSchema = new mongoose.Schema(
  {
    // ---- Links (all copied from the completed dose) ----
    doseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoseRecord",
      required: true,
      immutable: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
      immutable: true,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      immutable: true,
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

// One feedback per dose -> prevents duplicates / double submit
feedbackSchema.index({ doseRecordId: 1 }, { unique: true });

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