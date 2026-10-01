const mongoose = require("mongoose");

const dutyAssignmentSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },

    dutyDate: {
      type: Date,
      required: true,
    },

    dutyType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);


//one worker one clinic and date is unique.
dutyAssignmentSchema.index(
  { workerId: 1, clinicId: 1, dutyDate: 1 },
  { unique: true }
);



module.exports = mongoose.model("DutyAssignment", dutyAssignmentSchema);