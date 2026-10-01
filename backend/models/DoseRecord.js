const mongoose = require("mongoose");
const doseRecordSchema = new mongoose.Schema(
  {
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "citizenType",
      required: true,
    },

    citizenType: {
      type: String,
      required: true,
      enum: ["User", "FamilyProfile"],
    },

    vaccineType: {
      type: String,
      required: true,
      trim: true,
    },

    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },

    dateAdministered: {
      type: Date,
      required: true,
      default: Date.now,
      validate: {
        // dateAdministered is a calendar date, not an exact time.
        // Compare calendar dates in the app's local timezone so today's
        // date is accepted even when the server is running in UTC.
        validator: function (value) {
          const timeZone = process.env.APP_TIMEZONE || "Asia/Dhaka";

          const formatDate = (date) =>
            new Intl.DateTimeFormat("en-CA", {
              timeZone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(date);

          return formatDate(value) <= formatDate(new Date());
        },
        message: "Date administered cannot be in the future",
      },
    },

    healthWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


doseRecordSchema.index({ citizenId: 1, citizenType: 1, dateAdministered: 1 });
doseRecordSchema.index({ batchNumber: 1, vaccineType: 1 });
module.exports = mongoose.model("DoseRecord", doseRecordSchema);