
const express = require("express");

const {
  getWorkerAppointments,
  getWorkerInventory,
  completeWorkerAppointment,
} = require("../controllers/workerAppointmentController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// GET WORKER APPOINTMENTS FOR A SELECTED DATE
// GET /api/worker-appointments/today?date=YYYY-MM-DD
router.get(
  "/today",
  authMiddleware,
  getWorkerAppointments
);


// GET AVAILABLE CLINIC VACCINE INVENTORY
// GET /api/worker-appointments/inventory
router.get(
  "/inventory",
  authMiddleware,
  getWorkerInventory
);


// COMPLETE AN ASSIGNED APPOINTMENT
// PATCH /api/worker-appointments/:appointmentId/complete
router.patch(
  "/:appointmentId/complete",
  authMiddleware,
  completeWorkerAppointment
);


module.exports = router;
