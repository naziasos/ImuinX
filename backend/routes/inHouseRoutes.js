
const express = require("express");

const router = express.Router();

const {
  createRequest,
  getMyRequests,
  getPendingRequests,
  acceptRequest,
  completeVisit,
} = require("../controllers/inHouseController");

const authMiddleware = require("../middleware/authMiddleware");
const workerMiddleware = require("../middleware/workerMiddleware");

// Citizen creates an in-house request
router
  .route("/")
  .post(authMiddleware, createRequest);



router
  .route("/my")
  .get(authMiddleware, getMyRequests);

  

// Health Worker views pending requests
router
  .route("/pending")
  .get(authMiddleware, workerMiddleware, getPendingRequests);

// Health Worker accepts a request
router
  .route("/:id/accept")
  .patch(authMiddleware, acceptRequest);

// Health Worker completes a visit
router
  .route("/:id/complete")
  .patch(authMiddleware, completeVisit);

module.exports = router;

