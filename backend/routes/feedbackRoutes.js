const express = require("express");
const mongoose = require("mongoose");

const Feedback = require("../models/Feedback");
const DoseRecord = require("../models/DoseRecord");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const ALLOWED_TAGS = [
  "Staff Behavior",
  "Waiting Time",
  "Cleanliness",
  "Process",
  "Information",
  "Other",
];

const STAFF_ROLES = ["worker", "clinicAdmin"];

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

async function getFeedbackForAuthorizedUser(req, feedbackId) {
  if (!isObjectId(feedbackId)) {
    return { error: { status: 400, message: "Invalid feedback reference" } };
  }

  const feedback = await Feedback.findById(feedbackId);

  if (!feedback) {
    return { error: { status: 404, message: "Feedback not found" } };
  }

  if (req.user.role === "citizen") {
    if (String(feedback.userId) !== String(req.user.id)) {
      return {
        error: {
          status: 403,
          message: "You are not allowed to access this feedback",
        },
      };
    }
    return { feedback };
  }

  if (isStaff(req.user.role)) {
    const staff = await User.findById(req.user.id).select("clinicId role");
    if (!staff) {
      return { error: { status: 404, message: "User not found" } };
    }

    if (!staff.clinicId || String(staff.clinicId) !== String(feedback.clinicId)) {
      return {
        error: {
          status: 403,
          message: "This feedback does not belong to your clinic",
        },
      };
    }

    return { feedback };
  }

  if (req.user.role === "admin") {
    return { feedback };
  }

  return {
    error: {
      status: 403,
      message: "You are not allowed to access feedback",
    },
  };
}

/*
|--------------------------------------------------------------------------
| GET MY PENDING FEEDBACK
|--------------------------------------------------------------------------
| Used by the citizen dashboard after a dose is completed.
*/
router.get("/my-pending", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "citizen") {
      return res.status(403).json({
        message: "Only citizens can access pending feedback",
      });
    }

    const feedback = await Feedback.find({
      userId: req.user.id,
      promptStatus: "Pending",
    })
      .sort({ createdAt: -1 })
      .populate("clinicId", "name location")
      .populate("citizenId", "name dateOfBirth relationship")
      .populate("doseRecordId", "vaccineType batchNumber dateAdministered");

    return res.json({ feedback });
  } catch (error) {
    console.error("Pending feedback error:", error);
    return res.status(500).json({
      message: "Server error while fetching pending feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET MY FEEDBACK
|--------------------------------------------------------------------------
| Returns both Pending and Submitted feedback owned by the logged-in citizen.
*/
router.get("/my", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "citizen") {
      return res.status(403).json({
        message: "Only citizens can access their feedback",
      });
    }

    const feedback = await Feedback.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate("clinicId", "name location")
      .populate("citizenId", "name dateOfBirth relationship")
      .populate("doseRecordId", "vaccineType batchNumber dateAdministered");

    return res.json({ feedback });
  } catch (error) {
    console.error("My feedback error:", error);
    return res.status(500).json({
      message: "Server error while fetching feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ONE FEEDBACK
|--------------------------------------------------------------------------
*/
router.get("/:feedbackId", authMiddleware, async (req, res) => {
  try {
    const result = await getFeedbackForAuthorizedUser(
      req,
      req.params.feedbackId
    );

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const feedback = await Feedback.findById(result.feedback._id)
      .populate("clinicId", "name location")
      .populate("userId", "name email")
      .populate("citizenId", "name dateOfBirth relationship")
      .populate("doseRecordId", "vaccineType batchNumber dateAdministered")
      .populate("responses.responderId", "name role");

    return res.json({ feedback });
  } catch (error) {
    console.error("Get feedback error:", error);
    return res.status(500).json({
      message: "Server error while fetching feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| SUBMIT FEEDBACK
|--------------------------------------------------------------------------
| Only the owner can submit.
| Link fields are never accepted from the client.
*/
router.patch("/:feedbackId/submit", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "citizen") {
      return res.status(403).json({
        message: "Only citizens can submit feedback",
      });
    }

    const { rating, comment = "", tags = [], isAnonymous = false } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be a whole number from 1 to 5",
      });
    }

    if (typeof comment !== "string" || comment.length > 1000) {
      return res.status(400).json({
        message: "Comment must be a string with at most 1000 characters",
      });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        message: "Tags must be an array",
      });
    }

    const invalidTags = tags.filter((tag) => !ALLOWED_TAGS.includes(tag));
    if (invalidTags.length > 0) {
      return res.status(400).json({
        message: `Invalid feedback tag: ${invalidTags[0]}`,
      });
    }

    if (typeof isAnonymous !== "boolean") {
      return res.status(400).json({
        message: "isAnonymous must be true or false",
      });
    }

    if (!isObjectId(req.params.feedbackId)) {
      return res.status(400).json({
        message: "Invalid feedback reference",
      });
    }

    const feedback = await Feedback.findOne({
      _id: req.params.feedbackId,
      userId: req.user.id,
    });

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    if (feedback.promptStatus === "Submitted") {
      return res.status(409).json({
        message: "This feedback has already been submitted",
      });
    }

    feedback.rating = rating;
    feedback.comment = comment.trim();
    feedback.tags = tags;
    feedback.isAnonymous = isAnonymous;
    feedback.promptStatus = "Submitted";
    feedback.submittedAt = new Date();

    await feedback.save();

    return res.status(200).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Submit feedback error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error while submitting feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| MAYBE LATER / DISMISS
|--------------------------------------------------------------------------
*/
router.patch("/:feedbackId/dismiss", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "citizen") {
      return res.status(403).json({
        message: "Only citizens can dismiss feedback prompts",
      });
    }

    if (!isObjectId(req.params.feedbackId)) {
      return res.status(400).json({
        message: "Invalid feedback reference",
      });
    }

    const feedback = await Feedback.findOne({
      _id: req.params.feedbackId,
      userId: req.user.id,
    });

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    if (feedback.promptStatus === "Submitted") {
      return res.status(409).json({
        message: "Submitted feedback cannot be dismissed",
      });
    }

    feedback.dismissCount += 1;
    feedback.lastDismissedAt = new Date();

    await feedback.save();

    return res.json({
      message: "Feedback prompt dismissed",
      feedback,
    });
  } catch (error) {
    console.error("Dismiss feedback error:", error);
    return res.status(500).json({
      message: "Server error while dismissing feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CLINIC FEEDBACK LIST
|--------------------------------------------------------------------------
| Worker/Clinic Admin: own clinic only.
| Admin: all clinics, optionally filtered by clinicId.
*/
router.get("/clinic/list", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only staff or admin can view clinic feedback",
      });
    }

    const {
      promptStatus,
      reviewStatus,
      rating,
      clinicId,
    } = req.query;

    const filter = {
      promptStatus: "Submitted",
    };

    if (promptStatus) {
      if (!["Pending", "Submitted"].includes(promptStatus)) {
        return res.status(400).json({
          message: "Invalid promptStatus",
        });
      }
      filter.promptStatus = promptStatus;
    }

    if (reviewStatus) {
      if (!["New", "Responded", "Resolved"].includes(reviewStatus)) {
        return res.status(400).json({
          message: "Invalid reviewStatus",
        });
      }
      filter.reviewStatus = reviewStatus;
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({
          message: "Rating must be a whole number from 1 to 5",
        });
      }
      filter.rating = numericRating;
    }

    if (req.user.role === "admin") {
      if (clinicId) {
        if (!isObjectId(clinicId)) {
          return res.status(400).json({
            message: "Invalid clinic reference",
          });
        }
        filter.clinicId = clinicId;
      }
    } else {
      const staff = await User.findById(req.user.id).select("clinicId");
      if (!staff) {
        return res.status(404).json({ message: "User not found" });
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
      .populate("citizenId", "name dateOfBirth relationship")
      .populate("userId", "name email")
      .populate("doseRecordId", "vaccineType batchNumber dateAdministered")
      .populate("responses.responderId", "name role");

    const safeFeedback = feedback.map((item) => {
      const obj = item.toObject();

      if (obj.isAnonymous) {
        delete obj.userId;
      }

      return obj;
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
| STAFF RESPONSE
|--------------------------------------------------------------------------
*/
router.post("/:feedbackId/respond", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only staff or admin can respond to feedback",
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

    const result = await getFeedbackForAuthorizedUser(
      req,
      req.params.feedbackId
    );

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const feedback = result.feedback;

    if (feedback.promptStatus !== "Submitted") {
      return res.status(400).json({
        message: "Only submitted feedback can receive a response",
      });
    }

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
    console.error("Feedback response error:", error);
    return res.status(500).json({
      message: "Server error while responding to feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| RESOLVE FEEDBACK
|--------------------------------------------------------------------------
*/
router.patch("/:feedbackId/resolve", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only staff or admin can resolve feedback",
      });
    }

    const result = await getFeedbackForAuthorizedUser(
      req,
      req.params.feedbackId
    );

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const feedback = result.feedback;

    if (feedback.promptStatus !== "Submitted") {
      return res.status(400).json({
        message: "Only submitted feedback can be resolved",
      });
    }

    if (feedback.reviewStatus === "Resolved") {
      return res.status(409).json({
        message: "Feedback is already resolved",
      });
    }

    feedback.reviewStatus = "Resolved";
    feedback.resolvedBy = req.user.id;
    feedback.resolvedAt = new Date();

    await feedback.save();

    return res.json({
      message: "Feedback resolved successfully",
      feedback,
    });
  } catch (error) {
    console.error("Resolve feedback error:", error);
    return res.status(500).json({
      message: "Server error while resolving feedback",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CLINIC SUMMARY
|--------------------------------------------------------------------------
*/
router.get("/clinic/summary", authMiddleware, async (req, res) => {
  try {
    if (!isStaff(req.user.role) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only staff or admin can view feedback summary",
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
        filter.clinicId = new mongoose.Types.ObjectId(req.query.clinicId);
      }
    } else {
      const staff = await User.findById(req.user.id).select("clinicId");
      if (!staff) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!staff.clinicId) {
        return res.status(400).json({
          message: "User is not assigned to any clinic",
        });
      }
      filter.clinicId = staff.clinicId;
    }

    const summary = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          fiveStar: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          fourStar: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          threeStar: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          twoStar: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
        },
      },
    ]);

    const data = summary[0] || {
      total: 0,
      averageRating: 0,
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    };

    if (data.averageRating !== undefined && data.averageRating !== null) {
      data.averageRating = Number(data.averageRating.toFixed(2));
    }

    delete data._id;

    return res.json({ summary: data });
  } catch (error) {
    console.error("Feedback summary error:", error);
    return res.status(500).json({
      message: "Server error while fetching feedback summary",
    });
  }
});

module.exports = router;
