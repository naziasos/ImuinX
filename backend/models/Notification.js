
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "appointment",
        "appointment_reminder",
        "dose",
        "missed_dose",
        "recovery_reason_submitted",
        "catch_up_schedule_ready",
        "recovery_review_required",
        "certificate",
        "general",
      ],
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Stable key for jobs/events that may be retried.
    // Sparse unique index leaves existing notification types unchanged.
    dedupeKey: {
      type: String,
      trim: true,
      default: undefined,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_notification_dedupe_key",
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
