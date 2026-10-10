
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
      default: null,
    },
    area: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    district: {
      type: String,
      trim: true,
      default: null,
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Existing fields
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["admin", "citizen", "clinicAdmin", "worker"],
      default: "citizen",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      default: null,
    },

    // New optional personal details
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    address: {
      type: addressSchema,
      default: null,
    },

        dateOfBirth: {
      type: Date,
      default: null,
    },

    // New optional health details
    bloodType: {
      type: String,
      enum: [
        "A+", "A-",
        "B+", "B-",
        "AB+", "AB-",
        "O+", "O-",
        null,
      ],
      default: null,
    },

    allergies: {
      type: [String],
      default: null,
    },

    // New optional emergency contact details
    emergencyContactName: {
      type: String,
      trim: true,
      default: null,
    },

    emergencyContactPhone: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
