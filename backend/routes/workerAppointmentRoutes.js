const express = require("express");
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const DutyAssignment = require("../models/DutyAssignment");
const User = require("../models/User");
const VaccineInventory = require("../models/VaccineInventory");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET TODAY'S APPOINTMENTS FOR WORKER
// =====================================================

router.get("/today", authMiddleware, async (req, res) => {
  try {
    // Only Worker can access this route
    if (req.user.role !== "worker") {
      return res.status(403).json({
        message: "Worker access required",
      });
    }

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    // Get logged-in worker
    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    // Worker must belong to a clinic
    if (!worker.clinicId) {
      return res.status(400).json({
        message: "Worker is not assigned to any clinic",
      });
    }

    // Convert selected date to day range
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Check whether this worker has vaccination duty today
    const duty = await DutyAssignment.findOne({
      workerId: worker._id,
      clinicId: worker.clinicId,
      dutyDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      dutyType: "Vaccination",
    });

    if (!duty) {
      return res.json({
        dutyAssigned: false,
        appointments: [],
      });
    }

    // Get confirmed appointments of worker's clinic
    const appointments = await Appointment.find({
      clinicId: worker.clinicId,
      dateTime: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: "Confirmed",
    })
      .populate("citizenId", "name email")
      .populate("familyProfileId", "name relationship gender dateOfBirth")
      .populate("clinicId", "name location contact")
      .sort({ dateTime: 1 });

    res.json({
      dutyAssigned: true,
      appointments,
    });
  } catch (error) {
    console.error(
      "Worker appointment fetch error:",
      error.message
    );

    res.status(500).json({
      message: "Server error while loading appointments",
    });
  }
});


// =====================================================
// GET CLINIC INVENTORY FOR WORKER
// =====================================================

router.get("/inventory", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        message: "Worker access required",
      });
    }

    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    if (!worker.clinicId) {
      return res.status(400).json({
        message: "Worker is not assigned to any clinic",
      });
    }

    const inventory = await VaccineInventory.find({
      clinicId: worker.clinicId,
      quantity: {
        $gt: 0,
      },
      expiryDate: {
        $gt: new Date(),
      },
    }).sort({
      vaccineType: 1,
      expiryDate: 1,
    });

    res.json({
      inventory,
    });
  } catch (error) {
    console.error(
      "Worker inventory fetch error:",
      error.message
    );

    res.status(500).json({
      message: "Server error while loading inventory",
    });
  }
});


// =====================================================
// =====================================================
// COMPLETE APPOINTMENT
// Vaccination details, inventory update, dose creation, and
// certificate generation are handled by POST /api/doses.
// =====================================================

router.patch(
  "/:appointmentId/complete",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "worker") {
        return res.status(403).json({
          message: "Worker access required",
        });
      }

      const { appointmentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const worker = await User.findById(req.user.id);

      if (!worker) {
        return res.status(404).json({
          message: "Worker not found",
        });
      }

      if (!worker.clinicId) {
        return res.status(400).json({
          message: "Worker is not assigned to any clinic",
        });
      }

      const appointment = await Appointment.findById(appointmentId)
        .populate("citizenId", "name email")
        .populate("familyProfileId", "name relationship gender dateOfBirth");

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      if (appointment.status !== "Confirmed") {
        return res.status(400).json({
          message: "Only confirmed appointments can be completed",
        });
      }

      if (String(appointment.clinicId) !== String(worker.clinicId)) {
        return res.status(403).json({
          message: "This appointment does not belong to your clinic",
        });
      }

      const appointmentDate = new Date(appointment.dateTime);
      const dateString = appointmentDate.toISOString().slice(0, 10);
      const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

      const duty = await DutyAssignment.findOne({
        workerId: worker._id,
        clinicId: worker.clinicId,
        dutyDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        dutyType: "Vaccination",
      });

      if (!duty) {
        return res.status(403).json({
          message: "You do not have vaccination duty for this appointment",
        });
      }

      appointment.status = "Completed";
      await appointment.save();

      res.json({
        message: "Appointment completed successfully. Please log the administered dose.",
        appointmentId: appointment._id,
        status: appointment.status,
        patient: appointment.familyProfileId
          ? {
              id: appointment.familyProfileId._id,
              type: "family",
              name: appointment.familyProfileId.name,
              relationship: appointment.familyProfileId.relationship,
              dateOfBirth: appointment.familyProfileId.dateOfBirth,
              gender: appointment.familyProfileId.gender,
            }
          : {
              id: appointment.citizenId._id,
              type: "user",
              name: appointment.citizenId.name,
              email: appointment.citizenId.email,
            },
      });
    } catch (error) {
      console.error("Appointment completion error:", error.message);

      res.status(500).json({
        message: "Server error while completing appointment",
      });
    }
  }
);

module.exports = router;