
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // Account holder who made the booking
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // null when booking for self
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

    // Vaccine selected from the existing vaccine catalogue
    vaccineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vaccine",
      required: true,
    },

    // Dose selected from the vaccine schedule
    doseNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Dose number must be a whole number.",
      },
    },

    // Preserve the existing appointment date/time field
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

// Useful for finding appointments for a person
appointmentSchema.index({
  citizenId: 1,
  familyProfileId: 1,
  dateTime: 1,
});

// Useful for checking booked clinic slots
appointmentSchema.index({
  clinicId: 1,
  dateTime: 1,
  status: 1,
});

module.exports = mongoose.model("Appointment", appointmentSchema);
