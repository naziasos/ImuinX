const express = require("express");
const mongoose = require("mongoose");

const DoseRecord = require("../models/DoseRecord");
const VaccineInventory = require("../models/VaccineInventory");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const certificateService = require("../services/certificateService");

const router = express.Router();

const CITIZEN_TYPE_MAP = {
  user: "User",
  family: "FamilyProfile",
};

function resolveCitizenModel(citizenType) {
  const modelName = CITIZEN_TYPE_MAP[citizenType];
  if (!modelName) return null;
  return modelName === "User" ? User : FamilyProfile;
}



router.post("/", authMiddleware, async (req, res) => {
  let reserved = null;

  try {
    const {
      citizenId,
      citizenType, 
      vaccineType,
      batchNumber,
      dateAdministered,
    } = req.body;

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

   
    const citizen = await CitizenModel.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        message: "Citizen profile not found",
      });
    }

    const trimmedVaccineType = vaccineType.trim();
    const trimmedBatchNumber = batchNumber.trim();
    const now = new Date();

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
      
      await VaccineInventory.updateOne(
        { _id: reserved._id },
        { $inc: { quantity: 1 } }
      );
      reserved = null; 

      if (createError.name === "ValidationError") {
        return res.status(400).json({
          message: createError.message,
        });
      }

      throw createError;
    }

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


router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "citizen") {
      return res.status(403).json({
        message: "Only citizens can access their vaccination history",
      });
    }

    const doses = await DoseRecord.find({
      citizenId: req.user.id,
      citizenType: "User",
    })
      .sort({ dateAdministered: -1 })
      .populate("clinicId", "name location")
      .populate("healthWorkerId", "name");

    res.json({ doses });
  } catch (error) {
    console.error("My vaccination history error:", error.message);

    res.status(500).json({
      message: "Server error while fetching vaccination history",
    });
  }
});

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
