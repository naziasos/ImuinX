
const InHouseRequest = require("../models/InHouseRequest");
const FamilyProfile = require("../models/FamilyProfile");
const DutyAssignment = require("../models/DutyAssignment");
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

    // Verify that the selected family member belongs
    // to the logged-in citizen.
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

    const newRequest = await InHouseRequest.create({
      citizen: req.user._id,
      familyMember: familyMember || null,
      address: address.trim(),
      location: location.trim(),
      preferredDate: requestedDate,
      vaccineOrReason: vaccineOrReason.trim(),
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "In-house visit requested successfully",
      requestId: newRequest._id,
      data: newRequest,
    });
  } catch (error) {
    console.error("Create in-house request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create in-house request",
    });
  }
};

// @desc    Get logged-in citizen's in-house requests
// @route   GET /api/in-house-requests/my
// @access  Private (Citizen)
const getMyRequests = async (req, res) => {
  try {
    const requests = await InHouseRequest.find({
      citizen: req.user._id,
    })
      .populate("familyMember", "name relation relationship age")
      .populate("assignedWorker", "name phone email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get my in-house requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your in-house requests",
    });
  }
};

// @desc    Get all pending in-house requests
// @route   GET /api/in-house-requests/pending
// @access  Private (Health Worker)
const getPendingRequests = async (req, res) => {
  try {
    // Shared pool: eligible workers can choose
    // any pending request from this list.
    const requests = await InHouseRequest.find({
      status: "Pending",
      assignedWorker: null,
    })
      .populate("citizen", "name phone email")
      .populate("familyMember", "name relation age")
      .sort({ preferredDate: 1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get pending in-house requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending requests",
    });
  }
};

// @desc    Get accepted requests assigned to logged-in worker
// @route   GET /api/in-house-requests/assigned
// @access  Private (Health Worker)
const getAssignedRequests = async (req, res) => {
  try {
    const requests = await InHouseRequest.find({
      assignedWorker: req.user._id,
      status: "Accepted",
    })
      .populate("citizen", "name phone email")
      .populate("familyMember", "name relation age")
      .sort({ preferredDate: 1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get assigned in-house requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assigned requests",
    });
  }
};

// @desc    Accept an in-house request
// @route   PATCH /api/in-house-requests/:id/accept
// @access  Private (Health Worker)
const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await InHouseRequest.findById(id);

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

    // Find the worker's in-house duty on the requested date.
    // These UTC boundaries should match the existing duty routes.
    const startOfDay = new Date(request.preferredDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const duty = await DutyAssignment.findOne({
      workerId: req.user._id,
      dutyType: "In-House Visit",
      dutyDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (!duty) {
      return res.status(403).json({
        success: false,
        message:
          "You are not assigned to in-house duty on this date",
      });
    }

    // Atomic update: only one worker can accept a pending request.
    // MongoDB matches assignedWorker: null when the field is null
    // or absent, so existing pending records can still be accepted.
    const acceptedRequest = await InHouseRequest.findOneAndUpdate(
      {
        _id: id,
        status: "Pending",
        assignedWorker: null,
      },
      {
        $set: {
          status: "Accepted",
          assignedWorker: req.user._id,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("citizen", "name phone email")
      .populate("familyMember", "name relation age");

    if (!acceptedRequest) {
      return res.status(409).json({
        success: false,
        message:
          "This request has already been accepted by another worker",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Request accepted successfully",
      data: acceptedRequest,
    });
  } catch (error) {
    console.error("Accept in-house request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to accept in-house request",
    });
  }
};

// @desc    Mark an assigned in-house visit as completed
// @route   PATCH /api/in-house-requests/:id/complete
// @access  Private (Health Worker)
const completeVisit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    // Only the assigned worker can complete an accepted request.
    const completedRequest = await InHouseRequest.findOneAndUpdate(
      {
        _id: id,
        assignedWorker: req.user._id,
        status: "Accepted",
      },
      {
        $set: {
          status: "Completed",
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!completedRequest) {
      return res.status(404).json({
        success: false,
        message:
          "No accepted request assigned to you was found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Visit marked as completed successfully",
      data: completedRequest,
    });
  } catch (error) {
    console.error("Complete in-house visit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete in-house visit",
    });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getPendingRequests,
  getAssignedRequests,
  acceptRequest,
  completeVisit,
};
