const express = require("express");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// SEARCH PEOPLE (registered citizens + family members)
// Used when logging a dose: a health worker can log a dose
// against either a registered citizen's own User account, or
// against a FamilyProfile registered under someone else's account.
// =====================================================

router.get("/search", authMiddleware, async (req, res) => {
  try {
    const query = (req.query.query || "").trim();

    if (query.length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters",
      });
    }

    // Escape regex special characters in the user-supplied query.
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(safeQuery, "i");

    const [registeredCitizens, familyMembers] = await Promise.all([
      User.find({ role: "citizen", name: nameRegex }).select(
        "name email"
      ),
      FamilyProfile.find({ name: nameRegex }).populate(
        "guardianId",
        "name"
      ),
    ]);

    // Registered citizens: the person's own User account is the
    // "patient" record — type "user", id points at the User doc.
    const userResults = registeredCitizens.map((u) => ({
      _id: u._id,
      type: "user",
      name: u.name,
      relationship: "Self (registered citizen)",
      dateOfBirth: null,
      gender: null,
      guardianId: null,
    }));

    // Family members: dependents registered under a guardian's
    // account — type "family", id points at the FamilyProfile doc.
    const familyResults = familyMembers.map((f) => ({
      _id: f._id,
      type: "family",
      name: f.name,
      relationship: f.relationship,
      dateOfBirth: f.dateOfBirth,
      gender: f.gender,
      guardianId: f.guardianId,
    }));

    res.json({
      citizens: [...userResults, ...familyResults],
    });
  } catch (error) {
    console.error("Person search error:", error.message);

    res.status(500).json({
      message: "Server error while searching for a person",
    });
  }
});

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