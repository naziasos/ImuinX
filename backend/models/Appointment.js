const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },



    familyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyProfile",
      default: null,
    },





    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },

    dateTime: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Confirmed",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);