const express = require("express");
const mongoose = require("mongoose");

const Feedback = require("../models/Feedback");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const STAFF_ROLES = ["worker", "clinicAdmin"];

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

async function getStaffClinic(req) {
  if (!isStaff(req.user.role)) {
    return null;
  }

  return User.findById(req.user.id).select("clinicId role");
}

/*
|--------------------------------------------------------------------------
| GET CLINIC FEEDBACK
|--------------------------------------------------------------------------
| Staff/Admin can see feedback.
| Worker/Clinic Admin -> only their own clinic.
| Admin -> can optionally use clinicId.
*/
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only clinic staff or admin can view feedback",
      });
    }

    const filter = {
      promptStatus: "Submitted",
    };

    if (req.user.role === "admin") {
      if (req.query.clinicId) {
        if (!isObjectId(req.query.clinicId)) {
          return res.status(400).json({
            message: "Invalid clinic reference",
          });
        }

        filter.clinicId = req.query.clinicId;
      }
    } else {
      const staff = await getStaffClinic(req);

      if (!staff) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!staff.clinicId) {
        return res.status(400).json({
          message: "User is not assigned to any clinic",
        });
      }

      filter.clinicId = staff.clinicId;
    }

    const feedback = await Feedback.find(filter)
      .sort({ submittedAt: -1, createdAt: -1 })
      .populate("clinicId", "name location")
      .populate("userId", "name email")
      .populate("citizenId", "name dateOfBirth relationship")
      .populate(
        "doseRecordId",
        "vaccineType batchNumber dateAdministered"
      )
      .populate("responses.responderId", "name role");

    const safeFeedback = feedback.map((item) => {
      const data = item.toObject();

      if (data.isAnonymous) {
        delete data.userId;
        delete data.citizenId;
        delete data.citizenType;
      }

      return data;
    });

    return res.json({
      feedback: safeFeedback,
    });
  } catch (error) {
    console.error("Clinic feedback list error:", error);

    return res.status(500).json({
      message: "Server error while fetching clinic feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET CLINIC FEEDBACK SUMMARY
|--------------------------------------------------------------------------
*/
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only clinic staff or admin can view feedback summary",
      });
    }

    const filter = {
      promptStatus: "Submitted",
    };

    if (req.user.role === "admin") {
      if (req.query.clinicId) {
        if (!isObjectId(req.query.clinicId)) {
          return res.status(400).json({
            message: "Invalid clinic reference",
          });
        }

        filter.clinicId = new mongoose.Types.ObjectId(
          req.query.clinicId
        );
      }
    } else {
      const staff = await getStaffClinic(req);

      if (!staff) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!staff.clinicId) {
        return res.status(400).json({
          message: "User is not assigned to any clinic",
        });
      }

      filter.clinicId = staff.clinicId;
    }

    const result = await Feedback.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: 1,
          },
          averageRating: {
            $avg: "$rating",
          },
        },
      },
    ]);

    const summary = result[0] || {
      total: 0,
      averageRating: 0,
    };

    delete summary._id;

    summary.averageRating = Number(
      (summary.averageRating || 0).toFixed(2)
    );

    return res.json({
      summary,
    });
  } catch (error) {
    console.error("Clinic feedback summary error:", error);

    return res.status(500).json({
      message: "Server error while fetching feedback summary",
    });
  }
});

/*
|--------------------------------------------------------------------------
| RESPOND / EDIT RESPONSE
|--------------------------------------------------------------------------
| One response per feedback per author.
| Same author can edit their existing response.
*/
router.put("/:feedbackId/respond", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only clinic staff or admin can respond to feedback",
      });
    }

    if (!isObjectId(req.params.feedbackId)) {
      return res.status(400).json({
        message: "Invalid feedback reference",
      });
    }

    const message =
      typeof req.body.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        message: "Response message is required",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        message: "Response message cannot exceed 1000 characters",
      });
    }

    const feedback = await Feedback.findById(req.params.feedbackId);

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    if (feedback.promptStatus !== "Submitted") {
      return res.status(400).json({
        message: "Only submitted feedback can receive a response",
      });
    }

    // Clinic staff can only respond to their own clinic's feedback.
    if (isStaff(req.user.role)) {
      const staff = await getStaffClinic(req);

      if (!staff) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (
        !staff.clinicId ||
        String(staff.clinicId) !== String(feedback.clinicId)
      ) {
        return res.status(403).json({
          message: "This feedback does not belong to your clinic",
        });
      }
    }

    // Find an existing response written by this user.
    const existingResponse = feedback.responses.find(
      (response) =>
        String(response.responderId) === String(req.user.id)
    );

    if (existingResponse) {
      existingResponse.message = message;

      await feedback.save();

      return res.json({
        message: "Response updated successfully",
        feedback,
      });
    }

    // New response.
    feedback.responses.push({
      responderId: req.user.id,
      responderRole: req.user.role,
      message,
    });

    feedback.reviewStatus = "Responded";

    await feedback.save();

    return res.status(201).json({
      message: "Response added successfully",
      feedback,
    });
  } catch (error) {
    console.error("Clinic feedback response error:", error);

    return res.status(500).json({
      message: "Server error while responding to feedback",
    });
  }
});

module.exports = router;