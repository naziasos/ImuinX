
const mongoose = require("mongoose");

const vaccineScheduleSchema = new mongoose.Schema(
  {
    vaccineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vaccine",
      required: true,
    },

    minAgeDays: {
      type: Number,
      required: true,
      min: 0,
    },

    maxAgeDays: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          return (
            value === null ||
            value >= this.minAgeDays
          );
        },
        message: "Maximum age must be greater than or equal to minimum age.",
      },
    },

    doses: [
      {
        doseNumber: {
          type: Number,
          required: true,
          min: 1,
        },

        minIntervalDays: {
          type: Number,
          default: null,
          min: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VaccineSchedule",
  vaccineScheduleSchema
);
