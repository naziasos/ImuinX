const mongoose = require("mongoose");
const crypto = require("crypto");

const certificateSchema = new mongoose.Schema(
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
    doseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoseRecord",
      required: true,
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },

    issuedDate: {
      type: Date,
      required: true,
      immutable: true,
      default: Date.now,
    },

    // Set when a certificate is invalidated (e.g. issued in error).
    // Verification rejects any certificate with revokedAt set.
    revokedAt: {
      type: Date,
      default: null,
    },

    revokedReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ doseRecordId: 1 }, { unique: true });
certificateSchema.index({ citizenId: 1, citizenType: 1, issuedDate: -1 });

module.exports = mongoose.model("Certificate", certificateSchema);