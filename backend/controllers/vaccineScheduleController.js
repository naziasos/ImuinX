
const mongoose = require("mongoose");
const VaccineSchedule = require("../models/VaccineSchedule");
const Vaccine = require("../models/Vaccine");

// Create a vaccine schedule
const createVaccineSchedule = async (req, res) => {
  try {
    const { vaccineId, minAgeDays, maxAgeDays, doses } = req.body;

    if (
      !vaccineId ||
      minAgeDays === undefined ||
      minAgeDays === null ||
      minAgeDays === "" ||
      !Array.isArray(doses) ||
      doses.length === 0
    ) {
      return res.status(400).json({
        message: "Vaccine, minimum age, and doses are required.",
      });
    }

    if (!mongoose.isValidObjectId(vaccineId)) {
      return res.status(400).json({
        message: "Invalid vaccine ID.",
      });
    }

    const minAge = Number(minAgeDays);
    const maxAge =
      maxAgeDays === "" || maxAgeDays == null
        ? null
        : Number(maxAgeDays);

    if (!Number.isInteger(minAge) || minAge < 0) {
      return res.status(400).json({
        message: "Minimum age must be a non-negative whole number.",
      });
    }

    if (
      maxAge !== null &&
      (!Number.isInteger(maxAge) || maxAge < minAge)
    ) {
      return res.status(400).json({
        message:
          "Maximum age must be a whole number greater than or equal to minimum age.",
      });
    }

    const doseNumbers = [];

    const validatedDoses = [];

    for (const dose of doses) {
      const doseNumber = Number(dose.doseNumber);

      const minIntervalDays =
        dose.minIntervalDays === "" ||
        dose.minIntervalDays === undefined ||
        dose.minIntervalDays === null
          ? null
          : Number(dose.minIntervalDays);

      if (!Number.isInteger(doseNumber) || doseNumber < 1) {
        return res.status(400).json({
          message: "Each dose number must be a positive whole number.",
        });
      }

      if (doseNumbers.includes(doseNumber)) {
        return res.status(400).json({
          message: "Dose numbers cannot be duplicated.",
        });
      }

      doseNumbers.push(doseNumber);

      if (
        minIntervalDays !== null &&
        (!Number.isInteger(minIntervalDays) || minIntervalDays < 0)
      ) {
        return res.status(400).json({
          message: "Dose intervals must be non-negative whole numbers.",
        });
      }

      validatedDoses.push({
        doseNumber,
        minIntervalDays,
      });
    }

    const vaccineExists = await Vaccine.findOne({
      _id: vaccineId,
      isActive: true,
    });

    if (!vaccineExists) {
      return res.status(404).json({
        message: "Active vaccine not found.",
      });
    }

    const schedule = await VaccineSchedule.create({
      vaccineId,
      minAgeDays: minAge,
      maxAgeDays: maxAge,
      doses: validatedDoses,
    });

    return res.status(201).json({
      message: "Vaccine schedule created successfully.",
      schedule,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Create vaccine schedule error:", error);

    return res.status(500).json({
      message: "Server error while creating vaccine schedule.",
    });
  }
};

// Get all vaccine schedules
const getVaccineSchedules = async (req, res) => {
  try {
    const schedules = await VaccineSchedule.find()
      .populate("vaccineId", "name code")
      .sort({ minAgeDays: 1 });

    return res.status(200).json({
      schedules,
    });
  } catch (error) {
    console.error("Get vaccine schedules error:", error);

    return res.status(500).json({
      message: "Server error while fetching vaccine schedules.",
    });
  }
};

module.exports = {
  createVaccineSchedule,
  getVaccineSchedules,
};
