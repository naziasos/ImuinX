
console.log("🔥 VACCINE INVENTORY ROUTES FILE LOADED");
const express = require("express");

const VaccineInventory = require("../models/VaccineInventory");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const LOW_STOCK_THRESHOLD = 10;
const NEAR_EXPIRY_DAYS = 30;

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
    // Validate expiry date
const expiry = new Date(expiryDate);
const today = new Date();

today.setHours(0, 0, 0, 0);

if (isNaN(expiry.getTime()) || expiry <= today) {
  return res.status(400).json({
    message: "Expiry date must be in the future",
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
    // Check duplicate batch number in the same clinic
const existingBatch = await VaccineInventory.findOne({
  clinicId: user.clinicId,
  batchNumber: batchNumber.trim(),
});

if (existingBatch) {
  return res.status(409).json({
    message: "Batch number already exists in this clinic",
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
        inventoryId: inventory._id,
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

const today = new Date();

const updatedInventory = inventory.map((item) => {
  const expiryDate = new Date(item.expiryDate);

  const daysUntilExpiry =
    (expiryDate - today) /
    (1000 * 60 * 60 * 24);

  return {
    ...item.toObject(),

    lowStock:
      item.quantity <= LOW_STOCK_THRESHOLD,

    nearExpiry:
      daysUntilExpiry >= 0 &&
      daysUntilExpiry <= NEAR_EXPIRY_DAYS,

    daysUntilExpiry: Math.ceil(daysUntilExpiry),
  };
});

res.json({
  clinicId: user.clinicId,
  inventory: updatedInventory,
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

const today = new Date();
const expiry = new Date(inventory.expiryDate);

const daysUntilExpiry =
  (expiry - today) /
  (1000 * 60 * 60 * 24);

const lowStock =
  inventory.quantity <= LOW_STOCK_THRESHOLD;

const nearExpiry =
  daysUntilExpiry >= 0 &&
  daysUntilExpiry <= NEAR_EXPIRY_DAYS;

res.json({
  message: "Vaccine stock updated successfully",

  inventory: {
    ...inventory.toObject(),
    lowStock,
    nearExpiry,
    daysUntilExpiry: Math.ceil(daysUntilExpiry),
  },
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

