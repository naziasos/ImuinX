const mongoose = require("mongoose");

// A person vaccinated through a public campaign without creating an account.
// The email is verified by OTP at booking time. If the person registers later
// with the same (verified) email, `claimedBy` links this profile to the account.
const guestProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: { type: String, trim: true, default: null },

    dateOfBirth: { type: Date, required: true },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },

    // Filled by the health worker at check-in (only the last 4 characters are kept)
    idType: { type: String, trim: true, default: null },
    idLast4: { type: String, trim: true, default: null },

    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuestProfile", guestProfileSchema);
