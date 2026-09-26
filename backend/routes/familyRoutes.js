const express = require("express");
const FamilyProfile = require("../models/FamilyProfile");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Add a family member
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, dateOfBirth, gender, relationship } = req.body;

    const familyMember = await FamilyProfile.create({
      guardianId: req.user.id,
      name,
      dateOfBirth,
      gender,
      relationship,
    });

    res.status(201).json({
      message: "Family member added successfully",
      familyMember,
    });
  } catch (error) {
    console.error("Add family member error:", error);

    res.status(500).json({
      message: "Failed to add family member",
    });
  }
});




// Get logged-in citizen's family members
router.get("/", authMiddleware, async (req, res) => {
  try {
    const familyMembers = await FamilyProfile.find({
      guardianId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      familyMembers,
    });
  } catch (error) {
    console.error("Get family members error:", error);

    res.status(500).json({
      message: "Failed to get family members",
    });
  }
});



module.exports = router;