
const mongoose = require("mongoose");

const VaccineInventory = require("../models/VaccineInventory");
const Vaccine = require("../models/Vaccine");
const User = require("../models/User");

const LOW_STOCK_THRESHOLD = 10;
const NEAR_EXPIRY_DAYS = 30;

// Helper: validate and normalize an expiry date
const getValidExpiryDate = (value) => {
  if (!value) return null;

  const expiry = new Date(value);

  if (isNaN(expiry.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  if (expiry <= today) return null;

  return expiry;
};

// Helper: calculate stock and expiry warnings
const addInventoryFlags = (item) => {
  const inventory = item.toObject();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(inventory.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil(
    (expiry - today) / (1000 * 60 * 60 * 24)
  );

  return {
    ...inventory,
    lowStock: inventory.quantity <= LOW_STOCK_THRESHOLD,
    nearExpiry:
      daysUntilExpiry >= 0 &&
      daysUntilExpiry <= NEAR_EXPIRY_DAYS,
    daysUntilExpiry,
  };
};

// CREATE VACCINE INVENTORY
const createInventory = async (req, res) => {
  try {
    const { vaccineId, batchNumber, quantity, expiryDate } =
      req.body;

    if (
      !vaccineId ||
      !mongoose.isValidObjectId(vaccineId) ||
      !batchNumber?.trim() ||
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !expiryDate
    ) {
      return res.status(400).json({
        message:
          "Vaccine, batch number, quantity and expiry date are required",
      });
    }

    const stockQuantity = Number(quantity);

    if (
      !Number.isFinite(stockQuantity) ||
      stockQuantity < 0
    ) {
      return res.status(400).json({
        message: "Quantity must be a valid non-negative number",
      });
    }

    const expiry = getValidExpiryDate(expiryDate);

    if (!expiry) {
      return res.status(400).json({
        message: "Expiry date must be in the future",
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
          "Only Clinic Admin or Worker can manage vaccine inventory",
      });
    }

    const vaccine = await Vaccine.findById(vaccineId);

    if (!vaccine || !vaccine.isActive) {
      return res.status(400).json({
        message: "Vaccine not found or is inactive",
      });
    }

    const normalizedBatchNumber = batchNumber.trim();

    const existingBatch = await VaccineInventory.findOne({
      clinicId: user.clinicId,
      batchNumber: normalizedBatchNumber,
    });

    if (existingBatch) {
      return res.status(409).json({
        message: "Batch number already exists in this clinic",
      });
    }

    const inventory = await VaccineInventory.create({
      vaccineId,
      clinicId: user.clinicId,
      batchNumber: normalizedBatchNumber,
      quantity: stockQuantity,
      expiryDate: expiry,
    });

    return res.status(201).json({
      message: "Vaccine inventory created successfully",
      inventoryId: inventory._id,
      inventory,
    });
  } catch (error) {
    console.error("Vaccine inventory creation error:", error);

    return res.status(500).json({
      message: "Server error while creating vaccine inventory",
    });
  }
};

// GET MY CLINIC'S VACCINE INVENTORY
const getMyClinicInventory = async (req, res) => {
  try {
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

    const inventory = await VaccineInventory.find({
      clinicId: user.clinicId,
    })
      .populate("clinicId", "name location")
      .populate("vaccineId", "name code description")
      .sort({ expiryDate: 1 });

    return res.json({
      clinicId: user.clinicId,
      inventory: inventory.map(addInventoryFlags),
    });
  } catch (error) {
    console.error("Vaccine inventory fetch error:", error);

    return res.status(500).json({
      message: "Server error while loading vaccine inventory",
    });
  }
};

// UPDATE EXISTING VACCINE STOCK
const updateInventory = async (req, res) => {
  try {
    const { quantity, expiryDate } = req.body;

    if (
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !expiryDate
    ) {
      return res.status(400).json({
        message: "Quantity and expiry date are required",
      });
    }

    const stockQuantity = Number(quantity);

    if (
      !Number.isFinite(stockQuantity) ||
      stockQuantity < 0
    ) {
      return res.status(400).json({
        message: "Quantity must be a valid non-negative number",
      });
    }

    const expiry = getValidExpiryDate(expiryDate);

    if (!expiry) {
      return res.status(400).json({
        message: "Expiry date must be in the future",
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

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid inventory ID",
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

    inventory.quantity = stockQuantity;
    inventory.expiryDate = expiry;

    await inventory.save();

    return res.json({
      message: "Vaccine stock updated successfully",
      inventory: addInventoryFlags(inventory),
    });
  } catch (error) {
    console.error("Vaccine inventory update error:", error);

    return res.status(500).json({
      message: "Server error while updating vaccine inventory",
    });
  }
};



// DELETE VACCINE INVENTORY BATCH
const deleteInventory = async (req, res) => {
  try {
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
        message: "You are not allowed to delete inventory",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid inventory ID",
      });
    }

    // Only find a batch belonging to this user's clinic
    const inventory = await VaccineInventory.findOne({
      _id: req.params.id,
      clinicId: user.clinicId,
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory batch not found in your clinic",
      });
    }

    await VaccineInventory.deleteOne({
      _id: inventory._id,
      clinicId: user.clinicId,
    });

    return res.json({
      message: "Vaccine inventory batch deleted successfully",
      deletedId: inventory._id,
    });
  } catch (error) {
    console.error("Vaccine inventory deletion error:", error);

    return res.status(500).json({
      message: "Server error while deleting vaccine inventory",
    });
  }
};



module.exports = {
  createInventory,
  getMyClinicInventory,
  updateInventory,
  deleteInventory,
};
