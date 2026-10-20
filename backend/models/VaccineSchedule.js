const mongoose = require("mongoose");

const doseRuleSchema = new mongoose.Schema(
  {
    doseNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Dose number must be a whole number.",
      },
    },

    // Minimum interval from the relevant previous dose.
    minIntervalDays: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) =>
          value === null ||
          value === undefined ||
          Number.isInteger(value),
        message: "Minimum interval must be a whole number.",
      },
    },

    // Optional maximum interval from the approved guideline.
    maxIntervalDays: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) {
            return true;
          }

          if (!Number.isInteger(value)) {
            return false;
          }

          return (
            this.minIntervalDays == null ||
            value >= this.minIntervalDays
          );
        },
        message:
          "Maximum interval must be a whole number and cannot be less than the minimum interval.",
      },
    },
  },
  { _id: false }
);

const vaccineScheduleSchema = new mongoose.Schema(
  {
    vaccineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vaccine",
      required: true,
      index: true,
    },

    minAgeDays: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Minimum age must be a whole number.",
      },
    },

    maxAgeDays: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          return (
            value === null ||
            (Number.isInteger(value) &&
              value >= this.minAgeDays)
          );
        },
        message:
          "Maximum age must be a whole number greater than or equal to minimum age.",
      },
    },

    doses: {
      type: [doseRuleSchema],
      required: true,
      validate: [
        {
          validator: (doses) =>
            Array.isArray(doses) && doses.length > 0,
          message: "At least one dose rule is required.",
        },
        {
          validator: (doses) => {
            const numbers = doses.map(
              (dose) => dose.doseNumber
            );

            return new Set(numbers).size === numbers.length;
          },
          message: "Dose numbers cannot be duplicated.",
        },
      ],
    },

    guidelineSource: {
      type: String,
      trim: true,
      default: "Unverified",
    },

    guidelineVersion: {
      type: String,
      trim: true,
      default: "unverified",
    },

    // Only approved rules may be used for catch-up scheduling.
    isApproved: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VaccineSchedule",
  vaccineScheduleSchema
);
