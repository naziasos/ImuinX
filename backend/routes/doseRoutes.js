const express = require("express");
const mongoose = require("mongoose");

const DoseRecord = require("../models/DoseRecord");
const VaccineInventory = require("../models/VaccineInventory");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const certificateService = require("../services/certificateService");

const router = express.Router();

// Frontend-friendly type labels <-> the model names DoseRecord's
// refPath actually needs ("citizenType" must match a real Mongoose
// model name so populate() can resolve it dynamically).
const CITIZEN_TYPE_MAP = {
  user: "User",
  family: "FamilyProfile",
};

function resolveCitizenModel(citizenType) {
  const modelName = CITIZEN_TYPE_MAP[citizenType];
  if (!modelName) return null;
  return modelName === "User" ? User : FamilyProfile;
}

// =====================================================
// CREATE DOSE RECORD (validates the citizen, validates the
// batch against inventory, decrements stock on success)
// =====================================================

router.post("/", authMiddleware, async (req, res) => {
  let reserved = null;

  try {
    const {
      citizenId,
      citizenType, // "user" | "family"
      vaccineType,
      batchNumber,
      dateAdministered,
    } = req.body;

    // ---- Required fields ----
    if (!citizenId || !citizenType || !vaccineType || !batchNumber) {
      return res.status(400).json({
        message:
          "Citizen, citizen type, vaccine type and batch number are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(citizenId)) {
      return res.status(400).json({
        message: "Invalid citizen reference",
      });
    }

    const CitizenModel = resolveCitizenModel(citizenType);

    if (!CitizenModel) {
      return res.status(400).json({
        message: "citizenType must be either 'user' or 'family'",
      });
    }

    // ---- Logged-in health worker ----
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.clinicId) {
      return res.status(400).json({
        message: "User is not assigned to any clinic",
      });
    }

    if (user.role !== "clinicAdmin" && user.role !== "worker") {
      return res.status(403).json({
        message: "Only Clinic Admin or Worker can log dose records",
      });
    }

    // ---- Citizen must exist in whichever collection was named ----
    const citizen = await CitizenModel.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        message: "Citizen profile not found",
      });
    }

    const trimmedVaccineType = vaccineType.trim();
    const trimmedBatchNumber = batchNumber.trim();
    const now = new Date();

    // ---- Atomically validate + decrement inventory in one step ----
    // Only succeeds if the batch exists for this clinic/vaccine,
    // isn't expired, and has stock available. This avoids a race
    // between two workers logging a dose off the same last unit.
    reserved = await VaccineInventory.findOneAndUpdate(
      {
        clinicId: user.clinicId,
        vaccineType: trimmedVaccineType,
        batchNumber: trimmedBatchNumber,
        expiryDate: { $gt: now },
        quantity: { $gte: 1 },
      },
      { $inc: { quantity: -1 } },
      { new: true }
    );

    if (!reserved) {
      // Figure out *why* it failed so we can give a useful message.
      const existingBatch = await VaccineInventory.findOne({
        clinicId: user.clinicId,
        vaccineType: trimmedVaccineType,
        batchNumber: trimmedBatchNumber,
      });

      if (!existingBatch) {
        return res.status(400).json({
          message:
            "Unknown batch number: no matching batch found in this clinic's inventory",
        });
      }

      if (existingBatch.expiryDate <= now) {
        return res.status(400).json({
          message: "This batch has expired and cannot be administered",
        });
      }

      return res.status(400).json({
        message: "No stock remaining for this batch",
      });
    }

    // ---- Create the dose record ----
    let record;

    try {
      record = await DoseRecord.create({
        citizenId,
        citizenType: CITIZEN_TYPE_MAP[citizenType],
        vaccineType: trimmedVaccineType,
        batchNumber: trimmedBatchNumber,
        dateAdministered: dateAdministered || undefined,
        healthWorkerId: user._id,
        clinicId: user.clinicId,
      });
    } catch (createError) {
      // Roll back the inventory decrement since no record was saved.
      await VaccineInventory.updateOne(
        { _id: reserved._id },
        { $inc: { quantity: 1 } }
      );
      reserved = null; // already rolled back — don't repeat it below

      if (createError.name === "ValidationError") {
        return res.status(400).json({
          message: createError.message,
        });
      }

      throw createError;
    }

    // ---- Issue the signed QR certificate for the completed dose ----
    // Best-effort by design: the dose is already administered and the
    // stock already consumed, so a certificate problem must never turn
    // this into a failed request (which would invite a duplicate dose
    // entry). On failure `certificate` is null and staff can call
    // POST /api/certificates/dose/:doseRecordId/issue to retry.
    let certificate = null;

    try {
      const issued = await certificateService.issueForDose(record);
      certificate = await certificateService.buildQrPayload(
        issued.certificate
      );
    } catch (certificateError) {
      console.error(
        `Certificate issuance failed for dose ${record._id}:`,
        certificateError.message
      );
    }

    res.status(201).json({
      message: "Dose record created successfully",
      doseRecordId: record._id,
      record,
      remainingStock: reserved.quantity,
      certificate,
    });
  } catch (error) {
    // Best-effort rollback if something unexpected happened after we
    // already decremented the inventory.
    if (reserved) {
      try {
        await VaccineInventory.updateOne(
          { _id: reserved._id },
          { $inc: { quantity: 1 } }
        );
      } catch (rollbackError) {
        console.error(
          "Inventory rollback failed:",
          rollbackError.message
        );
      }
    }

    console.error("Dose record creation error:", error.message);

    res.status(500).json({
      message: "Server error while creating dose record",
    });
  }
});

// =====================================================
// GET DOSE HISTORY FOR A PERSON (either citizen type)
// GET /api/doses/citizen/:citizenId?citizenType=user|family
// =====================================================

router.get("/citizen/:citizenId", authMiddleware, async (req, res) => {
  try {
    const { citizenId } = req.params;
    const citizenType = req.query.citizenType;

    if (!mongoose.Types.ObjectId.isValid(citizenId)) {
      return res.status(400).json({
        message: "Invalid citizen reference",
      });
    }

    const filter = { citizenId };

    // citizenType is optional on this read path for backwards
    // compatibility, but when provided it must be valid and it keeps
    // the lookup precise (the same ObjectId could theoretically exist
    // in both the User and FamilyProfile collections).
    if (citizenType) {
      const modelName = CITIZEN_TYPE_MAP[citizenType];

      if (!modelName) {
        return res.status(400).json({
          message: "citizenType must be either 'user' or 'family'",
        });
      }

      filter.citizenType = modelName;
    }

    const doses = await DoseRecord.find(filter)
      .sort({ dateAdministered: -1 })
      .populate("citizenId", "name dateOfBirth relationship email")
      .populate("healthWorkerId", "name")
      .populate("clinicId", "name location");

    res.json({ doses });
  } catch (error) {
    console.error("Dose history fetch error:", error.message);

    res.status(500).json({
      message: "Server error while fetching dose history",
    });
  }
});

module.exports = router;
