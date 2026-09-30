const express = require("express");
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const DutyAssignment = require("../models/DutyAssignment");
const User = require("../models/User");
const DoseRecord = require("../models/DoseRecord");
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
// COMPLETE APPOINTMENT + CREATE DOSE RECORD
// =====================================================

router.patch(
  "/:appointmentId/complete",
  authMiddleware,
  async (req, res) => {
    let reservedInventory = null;
    let createdDose = null;

    try {
      // Only Worker can complete appointments
      if (req.user.role !== "worker") {
        return res.status(403).json({
          message: "Worker access required",
        });
      }

      const { vaccineType, batchNumber } = req.body;

      if (!vaccineType || !batchNumber) {
        return res.status(400).json({
          message:
            "Vaccine type and batch number are required",
        });
      }

      const { appointmentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      // Get worker
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

      // Get appointment
      const appointment = await Appointment.findById(
        appointmentId
      ).populate("citizenId", "name email");

      if (!appointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      // Appointment must be confirmed
      if (appointment.status !== "Confirmed") {
        return res.status(400).json({
          message:
            "Only confirmed appointments can be completed",
        });
      }

      // Appointment must belong to worker's clinic
      if (
        appointment.clinicId.toString() !==
        worker.clinicId.toString()
      ) {
        return res.status(403).json({
          message:
            "This appointment does not belong to your clinic",
        });
      }

      // Get appointment date
      const appointmentDate = new Date(
        appointment.dateTime
      );

      const dateString = appointmentDate
        .toISOString()
        .slice(0, 10);

      const startOfDay = new Date(
        `${dateString}T00:00:00.000Z`
      );

      const endOfDay = new Date(
        `${dateString}T23:59:59.999Z`
      );

      // Worker must have vaccination duty on appointment date
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
          message:
            "You do not have vaccination duty for this appointment",
        });
      }

      const cleanVaccineType =
        vaccineType.trim();

      const cleanBatchNumber =
        batchNumber.trim();

      const now = new Date();

      // Decrease vaccine inventory by 1
      reservedInventory =
        await VaccineInventory.findOneAndUpdate(
          {
            clinicId: worker.clinicId,
            vaccineType: cleanVaccineType,
            batchNumber: cleanBatchNumber,
            expiryDate: {
              $gt: now,
            },
            quantity: {
              $gte: 1,
            },
          },
          {
            $inc: {
              quantity: -1,
            },
          },
          {
            new: true,
          }
        );

      if (!reservedInventory) {
        const existingBatch =
          await VaccineInventory.findOne({
            clinicId: worker.clinicId,
            vaccineType: cleanVaccineType,
            batchNumber: cleanBatchNumber,
          });

        if (!existingBatch) {
          return res.status(400).json({
            message:
              "Batch number not found in this clinic's inventory",
          });
        }

        if (existingBatch.expiryDate <= now) {
          return res.status(400).json({
            message:
              "This vaccine batch has expired",
          });
        }

        return res.status(400).json({
          message:
            "No stock remaining for this batch",
        });
      }

      // Create dose record
      try {
        createdDose = await DoseRecord.create({
          citizenId: appointment.citizenId._id,
          citizenType: "User",
          vaccineType: cleanVaccineType,
          batchNumber: cleanBatchNumber,
          dateAdministered: new Date(),
          healthWorkerId: worker._id,
          clinicId: worker.clinicId,
        });
      } catch (doseError) {
        // Restore inventory if dose creation fails
        await VaccineInventory.updateOne(
          {
            _id: reservedInventory._id,
          },
          {
            $inc: {
              quantity: 1,
            },
          }
        );

        reservedInventory = null;

        throw doseError;
      }

      // Mark appointment as completed
      appointment.status = "Completed";

      await appointment.save();

      res.json({
        message:
          "Appointment completed and dose record created successfully",
        appointmentId: appointment._id,
        status: appointment.status,
        doseRecordId: createdDose._id,
        remainingStock:
          reservedInventory.quantity,
      });
    } catch (error) {
      // Restore inventory if something failed
      if (reservedInventory) {
        try {
          await VaccineInventory.updateOne(
            {
              _id: reservedInventory._id,
            },
            {
              $inc: {
                quantity: 1,
              },
            }
          );
        } catch (rollbackError) {
          console.error(
            "Inventory rollback error:",
            rollbackError.message
          );
        }
      }

      // Remove dose record if appointment completion failed
      if (createdDose) {
        try {
          await DoseRecord.deleteOne({
            _id: createdDose._id,
          });
        } catch (deleteError) {
          console.error(
            "Dose rollback error:",
            deleteError.message
          );
        }
      }

      console.error(
        "Appointment completion error:",
        error.message
      );

      res.status(500).json({
        message:
          "Server error while completing appointment",
      });
    }
  }
);


module.exports = router;