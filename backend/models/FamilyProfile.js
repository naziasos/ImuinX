
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

const familyProfileSchema = new mongoose.Schema(
  {
    // Existing fields
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },

    relationship: {
      type: String,
      enum: ["Child", "Spouse", "Parent", "Sibling", "Other"],
      required: true,
    },

    // Optional personal details
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    address: {
      type: addressSchema,
      default: null,
    },

    // Optional health details
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

    medicalNotes: {
      type: String,
      trim: true,
      default: null,
    },

    // Optional emergency contact
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

module.exports = mongoose.model("FamilyProfile", familyProfileSchema);
