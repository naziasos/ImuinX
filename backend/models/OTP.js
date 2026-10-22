const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: [
        "registration",
        "forgot-password",
        "guest-booking",
        "guest-certificate",
      ],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    // Wrong-code counter (guest flows lock after too many attempts)
    attempts: {
      type: Number,
      default: 0,
    },

    // Data held until the OTP is confirmed (e.g. the pending guest booking)
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OTP", otpSchema);