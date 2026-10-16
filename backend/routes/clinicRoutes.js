const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Clinic = require("../models/Clinic");
const DutyAssignment = require("../models/DutyAssignment");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const { sendClinicAdminCredentials } = require("../utils/email");
const { sendWorkerCredentials } = require("../utils/email");

const router = express.Router();
// Get all clinics
router.get("/", async (req, res) => {
  try {
    const clinics = await Clinic.find({
      status: "Active",
    }).select("name location contact status");

    res.json({
      clinics,
    });
  } catch (error) {
    console.error("Error fetching clinics:", error.message);

    res.status(500).json({
      message: "Failed to fetch clinics",
    });
  }
});

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

// Get workers of the logged-in Clinic Admin's clinic
router.get(
  "/my-clinic/workers",
  authMiddleware,
  async (req, res) => {
    try {
      // Only Clinic Admin can access this route
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({
          message: "Clinic Admin access required",
        });
      }

      // Get the logged-in user
      const clinicAdmin = await User.findById(req.user.id);

      if (!clinicAdmin) {
        return res.status(404).json({
          message: "Clinic Admin not found",
        });
      }

      if (!clinicAdmin.clinicId) {
        return res.status(404).json({
          message: "No clinic is assigned to this Clinic Admin",
        });
      }

      // Get clinic information
      const clinic = await Clinic.findById(clinicAdmin.clinicId)
        .populate("clinicAdmin", "name email");

      if (!clinic) {
        return res.status(404).json({
          message: "Clinic not found",
        });
      }

      // Get workers belonging ONLY to this clinic
      const workers = await User.find({
        clinicId: clinicAdmin.clinicId,
        role: "worker",
      }).select("-password");

      res.json({
        clinic: {
          id: clinic._id,
          name: clinic.name,
          location: clinic.location,
          contact: clinic.contact,
          status: clinic.status,
        },
        workers,
      });
    } catch (error) {
      console.error(
        "Clinic Admin dashboard error:",
        error.message
      );

      res.status(500).json({
        message: "Server error while loading clinic dashboard",
      });
    }
  }
);


// =====================================================
//  CREATE WORKER
// =====================================================

router.get("/my-clinic/test", (req, res) => {
  res.json({ message: "My clinic route works!" });
});

// Get a single worker profile for the logged-in Clinic Admin (read-only)
router.get(
  "/my-clinic/workers/:workerId",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({ message: "Clinic Admin access required" });
      }

      const clinicAdmin = await User.findById(req.user.id);
      if (!clinicAdmin?.clinicId) {
        return res.status(404).json({ message: "No clinic is assigned to this Clinic Admin" });
      }

      const worker = await User.findOne({
        _id: req.params.workerId,
        clinicId: clinicAdmin.clinicId,
        role: "worker",
      }).select("-password");

      if (!worker) {
        return res.status(404).json({ message: "Worker not found in your clinic" });
      }

      res.json({ worker });
    } catch (error) {
      console.error("Worker profile error:", error.message);
      res.status(500).json({ message: "Server error while loading worker profile" });
    }
  }
);

// Permanently remove a worker while preserving historical duties/vaccination records.
router.delete(
  "/my-clinic/workers/:workerId",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({ message: "Clinic Admin access required" });
      }

      const clinicAdmin = await User.findById(req.user.id);
      if (!clinicAdmin?.clinicId) {
        return res.status(404).json({ message: "No clinic is assigned to this Clinic Admin" });
      }

      const worker = await User.findOne({
        _id: req.params.workerId,
        clinicId: clinicAdmin.clinicId,
        role: "worker",
      });

      if (!worker) {
        return res.status(404).json({ message: "Worker not found in your clinic" });
      }

      // Keep historical records readable after the User document is deleted.
      await DutyAssignment.updateMany(
        { workerId: worker._id, clinicId: clinicAdmin.clinicId },
        {
          $set: {
            workerName: worker.name,
            workerEmail: worker.email,
            workerId: null,
          },
        }
      );

      const DoseRecord = require("../models/DoseRecord");
      await DoseRecord.updateMany(
        { healthWorkerId: worker._id, clinicId: clinicAdmin.clinicId },
        {
          $set: {
            healthWorkerName: worker.name,
            healthWorkerEmail: worker.email,
            healthWorkerId: null,
          },
        }
      );

      await User.deleteOne({ _id: worker._id });

      res.json({
        message: "Worker permanently removed. Historical work records were preserved.",
        workerId: worker._id,
      });
    } catch (error) {
      console.error("Worker deletion error:", error.message);
      res.status(500).json({ message: "Server error while deleting worker" });
    }
  }
);

router.post(
  "/my-clinic/workers",
  authMiddleware,
  async (req, res) => {
    try {
      const { name, email } = req.body;

      // Only Clinic Admin can create workers
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({
          message: "Clinic Admin access required",
        });
      }

      // Check required fields
      if (!name || !email) {
        return res.status(400).json({
          message: "Worker name and email are required",
        });
      }

      // Get logged-in Clinic Admin
      const clinicAdmin = await User.findById(req.user.id);

      if (!clinicAdmin) {
        return res.status(404).json({
          message: "Clinic Admin not found",
        });
      }

      // Check clinic assignment
      if (!clinicAdmin.clinicId) {
        return res.status(404).json({
          message: "No clinic is assigned to this Clinic Admin",
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (existingUser) {
        return res.status(409).json({
          message: "This email is already registered",
        });
      }

      // Generate temporary password
      const temporaryPassword = crypto
        .randomBytes(6)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 10);

      // Hash password
      const hashedPassword = await bcrypt.hash(
        temporaryPassword,
        10
      );

      // Create Worker
      const worker = await User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "worker",
        emailVerified: true,
        clinicId: clinicAdmin.clinicId,
      });

      // Send temporary password to worker's email
      await sendWorkerCredentials(
        email.trim().toLowerCase(),
        name.trim(),
        email.trim().toLowerCase(),
        temporaryPassword
      );

      res.status(201).json({
        message: "Worker created successfully",
        worker: {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          role: worker.role,
          clinicId: worker.clinicId,
        },
      });
    } catch (error) {
      console.error("Worker creation error:", error.message);

      res.status(500).json({
        message: "Server error while creating worker",
      });
    }
  }
);







// =====================================================
//  CREATE DUTY ASSIGNMENT
// =====================================================

router.post(
  "/my-clinic/duties",
  authMiddleware,
  async (req, res) => {
    try {
      const { workerId, dutyDate, dutyType } = req.body;

      // Only Clinic Admin can create duty assignments
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({
          message: "Clinic Admin access required",
        });
      }

      // Validate required fields
      if (!workerId || !dutyDate || !dutyType) {
        return res.status(400).json({
          message: "Worker, duty date and duty type are required",
        });
      }

      // Only these two duty types are allowed
      const allowedDutyTypes = [
        "Vaccination",
        "In-House Visit",
      ];

      if (!allowedDutyTypes.includes(dutyType.trim())) {
        return res.status(400).json({
          message:
            "Invalid duty type. Only Vaccination and In-House Visit are allowed",
        });
      }

      // Get logged-in Clinic Admin
      const clinicAdmin = await User.findById(req.user.id);

      if (!clinicAdmin) {
        return res.status(404).json({
          message: "Clinic Admin not found",
        });
      }

      // Check clinic assignment
      if (!clinicAdmin.clinicId) {
        return res.status(404).json({
          message: "No clinic is assigned to this Clinic Admin",
        });
      }

      // Check that the worker belongs to this clinic
      const worker = await User.findOne({
        _id: workerId,
        clinicId: clinicAdmin.clinicId,
        role: "worker",
      });

      if (!worker) {
        return res.status(404).json({
          message: "Worker not found in this clinic",
        });
      }

      // Create duty assignment





    const startOfDay = new Date(`${dutyDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${dutyDate}T23:59:59.999Z`);

    const existingDuty = await DutyAssignment.findOne({
      workerId: worker._id,
      clinicId: clinicAdmin.clinicId,
      dutyDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingDuty) {
      return res.status(409).json({
        message: `${worker.name} is already assigned to a duty on this date.`,
      });
    }



    









      const dutyAssignment = await DutyAssignment.create({
        workerId: worker._id,
        clinicId: clinicAdmin.clinicId,
        dutyDate,
        dutyType: dutyType.trim(),
      });

      res.status(201).json({
        message: "Duty assigned successfully",
        dutyAssignment,
      });
    } catch (error) {
      console.error(
        "Duty assignment error:",
        error.message
      );

      res.status(500).json({
        message: "Server error while creating duty assignment",
      });
    }
  }
);






// =====================================================
//  GET WORKER'S DUTIES
// =====================================================

router.get(
  "/my-duty",
  authMiddleware,
  async (req, res) => {
    try {
      // Only Worker can access this route
      if (req.user.role !== "worker") {
        return res.status(403).json({
          message: "Worker access required",
        });
      }

      // Get duties assigned to the logged-in worker
      const duties = await DutyAssignment.find({
        workerId: req.user.id,
      }).sort({ dutyDate: 1 });

      res.json({
        duties,
      });
    } catch (error) {
      console.error(
        "Worker duty fetch error:",
        error.message
      );

      res.status(500).json({
        message: "Server error while loading worker duties",
      });
    }
  }
);




// =====================================================
//  GET CLINIC DUTIES
// =====================================================

router.get(
  "/my-clinic/duties",
  authMiddleware,
  async (req, res) => {
    try {
      // Only Clinic Admin can access this route
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({
          message: "Clinic Admin access required",
        });
      }

      // Get logged-in Clinic Admin
      const clinicAdmin = await User.findById(req.user.id);

      if (!clinicAdmin) {
        return res.status(404).json({
          message: "Clinic Admin not found",
        });
      }

      if (!clinicAdmin.clinicId) {
        return res.status(404).json({
          message: "No clinic is assigned to this Clinic Admin",
        });
      }

      const { date } = req.query;

      // If a date is provided, return duties for that date only.
      // Otherwise, return all duties for this clinic.
      let query = {
        clinicId: clinicAdmin.clinicId,
      };

      if (date) {
        // Validate YYYY-MM-DD date format
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (!datePattern.test(date)) {
          return res.status(400).json({
            message: "Invalid date format",
          });
        }

        const startOfDay = new Date(
          `${date}T00:00:00.000Z`
        );

        const endOfDay = new Date(
          `${date}T23:59:59.999Z`
        );

        query.dutyDate = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
      }

      const duties = await DutyAssignment.find(query)
        .populate("workerId", "name email")
        .sort({
          dutyDate: 1,
          dutyType: 1,
        });

      res.json({
        duties,
      });
    } catch (error) {
      console.error(
        "Clinic duty fetch error:",
        error.message
      );

      res.status(500).json({
        message:
          "Server error while loading clinic duties",
      });
    }
  }
);










/* =====================================================
   DELETE DUTY ASSIGNMENT PERMANENTLY
   ===================================================== */

router.delete(
  "/my-clinic/duties/:dutyId",
  authMiddleware,
  async (req, res) => {
    try {
      // Only Clinic Admin can delete duties
      if (req.user.role !== "clinicAdmin") {
        return res.status(403).json({
          message: "Clinic Admin access required",
        });
      }

      // Validate the duty ID
      if (!require("mongoose").Types.ObjectId.isValid(req.params.dutyId)) {
        return res.status(400).json({
          message: "Invalid duty ID",
        });
      }

      // Find the logged-in Clinic Admin
      const clinicAdmin = await User.findById(req.user.id);

      if (!clinicAdmin) {
        return res.status(404).json({
          message: "Clinic Admin not found",
        });
      }

      if (!clinicAdmin.clinicId) {
        return res.status(404).json({
          message: "No clinic is assigned to this Clinic Admin",
        });
      }

      // Delete only a duty belonging to this clinic
      const deletedDuty = await DutyAssignment.findOneAndDelete({
        _id: req.params.dutyId,
        clinicId: clinicAdmin.clinicId,
      });

      if (!deletedDuty) {
        return res.status(404).json({
          message: "Duty not found in your clinic",
        });
      }

      res.status(200).json({
        message: "Duty permanently deleted from the database",
        dutyId: deletedDuty._id,
      });
    } catch (error) {
      console.error("Duty deletion error:", error.message);

      res.status(500).json({
        message: "Server error while deleting duty",
      });
    }
  }
);



module.exports = router;