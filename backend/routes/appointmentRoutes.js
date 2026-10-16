
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const appointmentController = require("../controllers/appointmentController");

// Availability and booking
router.get(
  "/slots",
  authMiddleware,
  appointmentController.getAvailableSlots
);

router.post(
  "/",
  authMiddleware,
  appointmentController.createAppointment
);

// Appointments for clinic staff
router.get(
  "/clinic/:clinicId",
  authMiddleware,
  appointmentController.getClinicAppointments
);

// Appointments for the logged-in citizen
router.get(
  "/citizen/:citizenId",
  authMiddleware,
  appointmentController.getCitizenAppointments
);

// Cancel an appointment
router.patch(
  "/:appointmentId/cancel",
  authMiddleware,
  appointmentController.cancelAppointment
);

// API test endpoint
router.get("/test", appointmentController.testAppointmentApi);

module.exports = router;
