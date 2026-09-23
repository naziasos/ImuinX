
const express = require("express");

const VaccineInventory = require("../models/VaccineInventory");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// CREATE VACCINE INVENTORY
// =====================================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      vaccineType,
      batchNumber,
      quantity,
      expiryDate,
    } = req.body;

    // Check required fields
    if (
      !vaccineType ||
      !batchNumber ||
      quantity === undefined ||
      !expiryDate
    ) {
      return res.status(400).json({
        message:
          "Vaccine type, batch number, quantity and expiry date are required",
      });
    }

    // Get logged-in user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // User must belong to a clinic
    if (!user.clinicId) {
      return res.status(400).json({
        message: "User is not assigned to any clinic",
      });
    }

    // Only Clinic Admin or Worker can add inventory
    if (
      user.role !== "clinicAdmin" &&
      user.role !== "worker"
    ) {
      return res.status(403).json({
        message:
          "Only Clinic Admin or Worker can manage vaccine inventory",
      });
    }

    // Create inventory
    const inventory = await VaccineInventory.create({
      vaccineType: vaccineType.trim(),
      batchNumber: batchNumber.trim(),
      quantity,
      expiryDate,
      clinicId: user.clinicId,
    });

    res.status(201).json({
      message: "Vaccine inventory created successfully",
      inventory,
    });
  } catch (error) {
    console.error(
      "Vaccine inventory creation error:",
      error.message
    );

    res.status(500).json({
      message:
        "Server error while creating vaccine inventory",
    });
  }
});

// =====================================================
// GET MY CLINIC'S VACCINE INVENTORY
// =====================================================

router.get("/my-clinic", authMiddleware, async (req, res) => {
  try {
    // Get logged-in user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check clinic assignment
    if (!user.clinicId) {
      return res.status(400).json({
        message: "User is not assigned to any clinic",
      });
    }

    // Get inventory only for this user's clinic
    const inventory = await VaccineInventory.find({
      clinicId: user.clinicId,
    })
      .populate("clinicId", "name location")
      .sort({ expiryDate: 1 });

    res.json({
      clinicId: user.clinicId,
      inventory,
    });
  } catch (error) {
    console.error(
      "Vaccine inventory fetch error:",
      error.message
    );

    res.status(500).json({
      message:
        "Server error while loading vaccine inventory",
    });
  }
});

// =====================================================
// UPDATE EXISTING VACCINE STOCK
// =====================================================

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { quantity, expiryDate } = req.body;

    if (quantity === undefined || !expiryDate) {
      return res.status(400).json({
        message: "Quantity and expiry date are required",
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

    if (
      user.role !== "clinicAdmin" &&
      user.role !== "worker"
    ) {
      return res.status(403).json({
        message:
          "Only Clinic Admin or Worker can update vaccine inventory",
      });
    }

    const inventory = await VaccineInventory.findOne({
      _id: req.params.id,
      clinicId: user.clinicId,
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Vaccine inventory not found",
      });
    }

    inventory.quantity = quantity;
    inventory.expiryDate = expiryDate;

    await inventory.save();

    res.json({
      message: "Vaccine stock updated successfully",
      inventory,
    });
  } catch (error) {
    console.error(
      "Vaccine inventory update error:",
      error.message
    );

    res.status(500).json({
      message:
        "Server error while updating vaccine inventory",
    });
  }
});



module.exports = router;

