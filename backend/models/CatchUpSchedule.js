const mongoose = require("mongoose");

const catchUpScheduleSchema = new mongoose.Schema(
  {
    // Account that receives the recovery notification.
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Person who missed the dose.
    profileType: {
      type: String,
      enum: ["User", "FamilyProfile"],
      required: true,
    },

    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "profileType",
      required: true,
    },

    vaccineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vaccine",
      required: true,
    },

    doseNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Dose number must be a whole number.",
      },
    },

    originalDueDate: {
      type: Date,
      required: true,
    },

    missedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Reason selected by the citizen or guardian.
    reasonCode: {
      type: String,
      enum: [
        "not_provided",
        "travel",
        "sick",
        "stock_unavailable",
        "appointment_issue",
        "forgot",
        "access_issue",
        "other",
      ],
      default: "not_provided",
    },

    reasonDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reportedAt: {
      type: Date,
      default: null,
    },

    suggestedDueDate: {
      type: Date,
      default: null,
    },

    // Rule used to generate the suggested schedule.
    sourceRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VaccineSchedule",
      default: null,
    },

    guidelineVersion: {
      type: String,
      default: null,
    },

    scheduleGeneratedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Missed",
        "ReasonProvided",
        "ReviewRequired",
        "ScheduleReady",
        "AppointmentBooked",
        "Completed",
        "Cancelled",
        "Superseded",
      ],
      default: "Missed",
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    completedDoseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoseRecord",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate recovery records for the same
// person, vaccine, dose and original due date.
catchUpScheduleSchema.index(
  {
    profileId: 1,
    profileType: 1,
    vaccineId: 1,
    doseNumber: 1,
    originalDueDate: 1,
  },
  {
    unique: true,
    name: "unique_missed_dose_recovery",
  }
);

// Efficient queries for the guardian dashboard.
catchUpScheduleSchema.index({
  guardianId: 1,
  status: 1,
  createdAt: -1,
});

// Efficient queries for a person's recovery history.
catchUpScheduleSchema.index({
  profileId: 1,
  profileType: 1,
  status: 1,
});

module.exports = mongoose.model(
  "CatchUpSchedule",
  catchUpScheduleSchema
);