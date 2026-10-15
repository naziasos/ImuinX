
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  createVaccineSchedule,
  getVaccineSchedules,
} = require("../controllers/vaccineScheduleController");

// Only authenticated admins can view schedules
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getVaccineSchedules
);

// Only authenticated admins can create schedules
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createVaccineSchedule
);

module.exports = router;
