const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // Account holder for regular and family-member appointments.
    // Campaign guest appointments may have no citizenId.
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: function () {
        return !this.campaignId;
      },
    },

    // Family member booked through a logged-in account.
    familyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyProfile",
      default: null,
    },

    // Public vaccination campaign, if applicable.
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },

    // Person booked through a public campaign.
    guestProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestProfile",
      default: null,
    },

    // Short appointment code, e.g. IMX-7K4Q9P.
    bookingCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: undefined,
    },

    // Identity verification by a health worker.
    identityVerifiedAt: {
      type: Date,
      default: null,
    },

    identityVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
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

    dateTime: {
      type: Date,
      required: true,
    },

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

// Booking code must be unique when provided.
appointmentSchema.index(
  { bookingCode: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_booking_code",
  }
);

// Find appointments belonging to an account, family member,
// or campaign guest.
appointmentSchema.index({
  citizenId: 1,
  familyProfileId: 1,
  guestProfileId: 1,
  dateTime: 1,
});

// Check booked clinic slots.
appointmentSchema.index({
  clinicId: 1,
  dateTime: 1,
  status: 1,
});

// Retrieve a worker's appointments.
appointmentSchema.index({
  assignedWorkerId: 1,
  dateTime: 1,
  status: 1,
});

// Find existing appointments for a person's vaccine dose.
appointmentSchema.index({
  citizenId: 1,
  familyProfileId: 1,
  guestProfileId: 1,
  vaccineId: 1,
  doseNumber: 1,
  status: 1,
});

module.exports = mongoose.model("Appointment", appointmentSchema);