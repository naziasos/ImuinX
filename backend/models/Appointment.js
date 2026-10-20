
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

    // Appointment date and time
    dateTime: {
      type: Date,
      required: true,
    },

    // Health worker assigned to this appointment
    // null until automatic assignment takes place
    assignedWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

// Useful for retrieving a worker's appointments
appointmentSchema.index({
  assignedWorkerId: 1,
  dateTime: 1,
  status: 1,
});

// Used by the missed-dose job to avoid flagging an already-booked dose.
appointmentSchema.index({
  citizenId: 1,
  familyProfileId: 1,
  vaccineId: 1,
  doseNumber: 1,
  status: 1,
});

module.exports = mongoose.model("Appointment", appointmentSchema);
