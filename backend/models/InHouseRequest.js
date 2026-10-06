const mongoose = require('mongoose');

const inHouseRequestSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyProfile',
      default: null, // Null if the request is for the logged-in citizen themselves
    },
    address: {
      type: String,
      required: [true, 'Please provide an address for the in-house visit'],
      trim: true,
    },
    preferredDate: {
      type: Date,
      required: [true, 'Please specify a preferred date'],
    },
    vaccineOrReason: {
      type: String,
      required: [true, 'Please specify the vaccine name or reason for visit'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Track which health worker accepted/handled the visit
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InHouseRequest', inHouseRequestSchema);