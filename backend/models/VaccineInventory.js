
const mongoose = require("mongoose");

const vaccineInventorySchema = new mongoose.Schema(
  {
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

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    expiryDate: {
      type: Date,
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

module.exports = mongoose.model(
  "VaccineInventory",
  vaccineInventorySchema
);

