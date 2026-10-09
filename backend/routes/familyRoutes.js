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


/**
 * PATCH /api/family/:id
 * Update a family member linked to the logged-in guardian.
 */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const mongoose = require("mongoose");

    const { id } = req.params;

    // 1. Validate the family member ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid family member ID",
      });
    }

    // 2. Allow only fields that belong to a family profile.
    const allowedFields = [
      "name",
      "dateOfBirth",
      "gender",
      "relationship",
    ];

    const requestedFields = Object.keys(req.body);

    // 3. Reject an empty request.
    if (requestedFields.length === 0) {
      return res.status(400).json({
        message: "At least one field is required to update",
      });
    }

    // 4. Reject fields that are not editable.
    const invalidFields = requestedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: "Invalid field(s) provided",
        invalidFields,
      });
    }

    const updates = {};

    // 5. Validate and prepare the name.
    if (Object.hasOwn(req.body, "name")) {
      if (
        typeof req.body.name !== "string" ||
        !req.body.name.trim()
      ) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      updates.name = req.body.name.trim();
    }

    // 6. Validate the date of birth.
    if (Object.hasOwn(req.body, "dateOfBirth")) {
      const dob = req.body.dateOfBirth;

      if (
        typeof dob !== "string" ||
        dob.trim() === "" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
        Number.isNaN(Date.parse(dob)) ||
        new Date(dob).toISOString().slice(0, 10) !== dob
      ) {
        return res.status(400).json({
          message: "A valid date of birth is required (YYYY-MM-DD)",
        });
      }

      updates.dateOfBirth = new Date(`${dob}T00:00:00.000Z`);
    }

    // 7. Validate gender against the existing model enum.
    if (Object.hasOwn(req.body, "gender")) {
      const validGenders = ["Male", "Female", "Other"];

      if (!validGenders.includes(req.body.gender)) {
        return res.status(400).json({
          message: "Invalid gender",
        });
      }

      updates.gender = req.body.gender;
    }

    // 8. Validate relationship against the existing model enum.
    if (Object.hasOwn(req.body, "relationship")) {
      const validRelationships = [
        "Child",
        "Spouse",
        "Parent",
        "Sibling",
        "Other",
      ];

      if (!validRelationships.includes(req.body.relationship)) {
        return res.status(400).json({
          message: "Invalid relationship",
        });
      }

      updates.relationship = req.body.relationship;
    }

    // 9. Find and update ONLY a profile owned by this guardian.
    // The ownership check happens inside the database query.
    const familyMember = await FamilyProfile.findOneAndUpdate(
      {
        _id: id,
        guardianId: req.user.id,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // 10. Same response if the profile doesn't exist or
    // belongs to another guardian.
    if (!familyMember) {
      return res.status(404).json({
        message: "Family member not found in your account",
      });
    }

    // 11. Return the updated database document.
    return res.status(200).json({
      message: "Family member profile updated successfully",
      familyMember,
    });
  } catch (error) {
    console.error("Update family profile error:", error);

    return res.status(500).json({
      message: "Failed to update family member profile",
    });
  }
});

module.exports = router;