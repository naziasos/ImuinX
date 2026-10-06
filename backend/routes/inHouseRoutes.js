
const express = require("express");

const router = express.Router();

const {
  createRequest,
  getPendingRequests,
  acceptRequest,
  completeVisit,
} = require("../controllers/inHouseController");

const authMiddleware = require("../middleware/authMiddleware");

// Citizen creates an in-house request
router
  .route("/")
  .post(authMiddleware, createRequest);

// Health Worker views pending requests
router
  .route("/pending")
  .get(authMiddleware, getPendingRequests);

// Health Worker accepts a request
router
  .route("/:id/accept")
  .patch(authMiddleware, acceptRequest);

// Health Worker completes a visit
router
  .route("/:id/complete")
  .patch(authMiddleware, completeVisit);

module.exports = router;

