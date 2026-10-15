
const Vaccine = require("../models/Vaccine");

// @desc    Insert a new vaccine
// @route   POST /api/vaccines
// @access  Private (authorized admin)
const createVaccine = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vaccine name and code are required.",
      });
    }

    const vaccine = await Vaccine.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description:
        typeof description === "string" ? description.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Vaccine added successfully.",
      data: vaccine,
    });
  } catch (error) {
    // Duplicate vaccine code
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This vaccine code already exists.",
      });
    }

    console.error("Create vaccine error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add vaccine.",
    });
  }
};








const getVaccines = async (req, res) => {
  try {
    const vaccines = await Vaccine.find({
      isActive: true,
    }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      vaccines,
    });
  } catch (error) {
    console.error("Get vaccines error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching vaccines.",
    });
  }
};



module.exports = { createVaccine, getVaccines };
