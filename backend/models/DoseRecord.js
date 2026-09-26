const mongoose = require("mongoose");
const doseRecordSchema = new mongoose.Schema(
  {
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyProfile",
      required: true,
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
        validator: function (value) {
          return value <= new Date();
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
  },
  {
    timestamps: true,
  }
);

doseRecordSchema.index({ citizenId: 1, dateAdministered: 1 });
doseRecordSchema.index({ batchNumber: 1, vaccineType: 1 });
module.exports = mongoose.model("DoseRecord", doseRecordSchema);