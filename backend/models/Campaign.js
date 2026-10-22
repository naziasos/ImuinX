const mongoose = require("mongoose");

// A public vaccination campaign. Campaigns are shown in the notification
// bell for everyone (including visitors who are not logged in) and can be
// booked directly, without login or registration.
const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },

    description: { type: String, trim: true, default: "", maxlength: 500 },

    vaccineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vaccine",
      required: true,
    },

    doseNumber: { type: Number, min: 1, default: 1 },

    // Empty array = every active clinic can host the campaign.
    clinicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clinic" }],

    // Inclusive Bangladesh-local calendar dates, stored as YYYY-MM-DD.
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

campaignSchema.index({ isActive: 1, endDate: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);
