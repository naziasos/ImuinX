const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Clinic = require("../models/Clinic");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const { sendClinicAdminCredentials } = require("../utils/email");

const router = express.Router();

// Test route
router.get(
  "/test",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    res.json({
      message: "Clinic route is working!",
      adminId: req.user.id,
    });
  }
);

// Create Clinic + Clinic Admin
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let createdUser = null;
    let createdClinic = null;

    try {
      const {
        clinicName,
        location,
        contact,
        adminName,
        adminEmail,
      } = req.body;

      // 1. Validate required fields
      if (
        !clinicName ||
        !location ||
        !contact ||
        !adminName ||
        !adminEmail
      ) {
        return res.status(400).json({
          message: "All clinic and admin fields are required",
        });
      }

      // 2. Clean input
      const cleanClinicName = clinicName.trim();
      const cleanLocation = location.trim();
      const cleanContact = contact.trim();
      const cleanAdminName = adminName.trim();
      const cleanAdminEmail = adminEmail.trim().toLowerCase();

      // 3. Check if admin email already exists
      const existingUser = await User.findOne({
        email: cleanAdminEmail,
      });

      if (existingUser) {
        return res.status(409).json({
          message: "This admin email is already registered",
        });
      }

      // 4. Generate temporary password
      const temporaryPassword = crypto
        .randomBytes(6)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 10);

      // 5. Hash temporary password
      const hashedPassword = await bcrypt.hash(
        temporaryPassword,
        10
      );

      // 6. Create Clinic Admin account
      createdUser = await User.create({
        name: cleanAdminName,
        email: cleanAdminEmail,
        password: hashedPassword,
        role: "clinicAdmin",
        emailVerified: true,
      });

      // 7. Create Clinic
      createdClinic = await Clinic.create({
        name: cleanClinicName,
        location: cleanLocation,
        contact: cleanContact,
        clinicAdmin: createdUser._id,
        status: "Active",
      });

      // 8. Connect Clinic Admin to the Clinic
      createdUser.clinicId = createdClinic._id;
      await createdUser.save();

      // 9. Send login credentials by email
      await sendClinicAdminCredentials(
        cleanAdminEmail,
        cleanAdminName,
        cleanAdminEmail,
        temporaryPassword,
        cleanClinicName
      );

      // 10. Success response
      res.status(201).json({
        message:
          "Clinic created successfully. Login credentials have been sent to the Clinic Admin's email.",
        clinic: {
          id: createdClinic._id,
          name: createdClinic.name,
          location: createdClinic.location,
          contact: createdClinic.contact,
          status: createdClinic.status,
          clinicAdmin: {
            id: createdUser._id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
          },
        },
      });
    } catch (error) {
      console.error("Clinic creation error:", error.message);

      // Rollback if something fails
      if (createdClinic) {
        await Clinic.deleteOne({
          _id: createdClinic._id,
        });
      }

      if (createdUser) {
        await User.deleteOne({
          _id: createdUser._id,
        });
      }

      res.status(500).json({
        message:
          "Server error while creating clinic",
      });
    }
  }
);

module.exports = router;