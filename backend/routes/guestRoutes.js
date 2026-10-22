
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const guest = require("../controllers/guestController");

// Health worker / clinic admin routes
router.post("/worker/lookup", authMiddleware, guest.lookup);

router.post(
  "/worker/verify-and-dose",
  authMiddleware,
  guest.verifyAndLogDose
);

// Public guest certificate: Appointment ID + email
router.post(
  "/certificate/lookup",
  guest.lookupGuestCertificate
);

module.exports = router;
