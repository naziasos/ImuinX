
const InHouseRequest = require("../models/InHouseRequest");
const FamilyProfile = require("../models/FamilyProfile");
const mongoose = require("mongoose");

// @desc    Create a new in-house visit request (Citizen)
// @route   POST /api/in-house-requests
// @access  Private (Citizen)
const createRequest = async (req, res) => {
  try {
    const {
      familyMember,
      address,
      location,
      preferredDate,
      vaccineOrReason,
    } = req.body;

    // Validate required fields
    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Location is required",
      });
    }

    if (!preferredDate) {
      return res.status(400).json({
        success: false,
        message: "Preferred date is required",
      });
    }

    if (!vaccineOrReason || !vaccineOrReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vaccine or reason is required",
      });
    }

    // Validate preferred date
    const requestedDate = new Date(preferredDate);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid preferred date",
      });
    }

    if (requestedDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Preferred date must be in the future",
      });
    }

    // If a family member is selected,
    // make sure they belong to the logged-in citizen.
    if (familyMember) {
      if (!mongoose.Types.ObjectId.isValid(familyMember)) {
        return res.status(400).json({
          success: false,
          message: "Invalid family member ID",
        });
      }

      const linkedFamilyMember = await FamilyProfile.findOne({
        _id: familyMember,
        guardianId: req.user._id,
      });

      if (!linkedFamilyMember) {
        return res.status(403).json({
          success: false,
          message: "Family member is not linked to your account",
        });
      }
    }

    // Create the request
    const newRequest = await InHouseRequest.create({
      citizen: req.user._id,
      familyMember: familyMember || null,
      address: address.trim(),
      location: location.trim(),
      preferredDate: requestedDate,
      vaccineOrReason: vaccineOrReason.trim(),
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "In-house visit requested successfully",
      requestId: newRequest._id,
      data: newRequest,
    });
  } catch (error) {
    console.error("Create in-house request error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all pending in-house requests (Health Worker)
// @route   GET /api/in-house-requests/pending
// @access  Private (Health Worker)
const getPendingRequests = async (req, res) => {
  try {
    const requests = await InHouseRequest.find({ status: "Pending" })
      .populate("citizen", "name phone email")
      .populate("familyMember", "name relation age")
      .sort({ preferredDate: 1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Accept an in-house request (Health Worker)
// @route   PATCH /api/in-house-requests/:id/accept
// @access  Private (Health Worker)
const acceptRequest = async (req, res) => {
  try {
    const request = await InHouseRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    request.status = "Accepted";
    request.assignedWorker = req.user._id;

    await request.save();

    res.status(200).json({
      success: true,
      message: "Request accepted successfully",
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark an in-house request as completed (Health Worker)
// @route   PATCH /api/in-house-requests/:id/complete
// @access  Private (Health Worker)
const completeVisit = async (req, res) => {
  try {
    const request = await InHouseRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: "Only accepted visits can be marked as completed",
      });
    }

    request.status = "Completed";

    await request.save();

    res.status(200).json({
      success: true,
      message: "Visit marked as completed successfully",
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createRequest,
  getPendingRequests,
  acceptRequest,
  completeVisit,
};

