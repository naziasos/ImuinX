const express = require("express");
const mongoose = require("mongoose");

const DoseRecord = require("../models/DoseRecord");
const VaccineInventory = require("../models/VaccineInventory");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Feedback = require("../models/Feedback");

const authMiddleware = require("../middleware/authMiddleware");
const certificateService = require("../services/certificateService");

const router = express.Router();

const CITIZEN_TYPE_MAP = {
  user: "User",
  family: "FamilyProfile",
};

function isStaffRole(role) {
  return role === "worker" || role === "clinicAdmin";
}

function resolveCitizenModel(citizenType) {
  const modelName = CITIZEN_TYPE_MAP[citizenType];

  if (!modelName) return null;

  return modelName === "User"
    ? User
    : FamilyProfile;
}

/*
|--------------------------------------------------------------------------
| CREATE DOSE RECORD
|--------------------------------------------------------------------------
| Citizen's own dose:
|   citizenType = "user"
|   citizenId   = User._id
|
| Family member dose:
|   citizenType = "family"
|   citizenId   = FamilyProfile._id
|
| Certificate is automatically generated after dose creation.
|--------------------------------------------------------------------------
*/

router.post("/", authMiddleware, async (req, res) => {
  let reserved = null;

  try {
    const {
      citizenId,
      citizenType,
      vaccineType,
      batchNumber,
      dateAdministered,
      appointmentId,
    } = req.body;

    // ------------------------------------------------------------
    // Basic validation
    // ------------------------------------------------------------

    if (
      !citizenId ||
      !citizenType ||
      !vaccineType ||
      !batchNumber
    ) {
      return res.status(400).json({
        message:
          "Citizen, citizen type, vaccine type and batch number are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(citizenId)) {
      return res.status(400).json({
        message: "Invalid citizen reference",
      });
    }

    const CitizenModel =
      resolveCitizenModel(citizenType);

    if (!CitizenModel) {
      return res.status(400).json({
        message:
          "citizenType must be either 'user' or 'family'",
      });
    }

    // ------------------------------------------------------------
    // Logged-in worker
    // ------------------------------------------------------------

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.clinicId) {
      return res.status(400).json({
        message:
          "User is not assigned to any clinic",
      });
    }

    if (
      user.role !== "clinicAdmin" &&
      user.role !== "worker"
    ) {
      return res.status(403).json({
        message:
          "Only Clinic Admin or Worker can log dose records",
      });
    }

    // ------------------------------------------------------------
    // Find vaccination recipient
    // ------------------------------------------------------------

    const citizen =
      await CitizenModel.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        message: "Citizen profile not found",
      });
    }

    // ------------------------------------------------------------
    // Appointment validation
    // ------------------------------------------------------------

    let linkedAppointment = null;

    if (appointmentId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          appointmentId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid appointment reference",
        });
      }

      linkedAppointment =
        await Appointment.findById(
          appointmentId
        );

      if (!linkedAppointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      // Appointment must already be completed
      if (
        linkedAppointment.status !== "Completed"
      ) {
        return res.status(400).json({
          message:
            "Appointment must be completed before logging the dose",
        });
      }

      // Appointment must belong to same clinic
      if (
        String(linkedAppointment.clinicId) !==
        String(user.clinicId)
      ) {
        return res.status(403).json({
          message:
            "This appointment does not belong to your clinic",
        });
      }

      /*
       * IMPORTANT:
       *
       * If appointment has familyProfileId,
       * vaccination recipient is the family member.
       *
       * Otherwise recipient is the citizen.
       */

      const expectedCitizenId =
        linkedAppointment.familyProfileId
          ? String(
              linkedAppointment.familyProfileId
            )
          : String(
              linkedAppointment.citizenId
            );

      const expectedCitizenType =
        linkedAppointment.familyProfileId
          ? "FamilyProfile"
          : "User";

      if (
        expectedCitizenId !==
          String(citizenId) ||
        expectedCitizenType !==
          CITIZEN_TYPE_MAP[citizenType]
      ) {
        return res.status(400).json({
          message:
            "Selected citizen does not match the completed appointment",
        });
      }

      // Prevent duplicate dose for same appointment
      const existingDose =
        await DoseRecord.findOne({
          appointmentId,
        });

      if (existingDose) {
        return res.status(409).json({
          message:
            "A dose has already been logged for this appointment",
          doseRecordId:
            existingDose._id,
        });
      }
    }

    // ------------------------------------------------------------
    // Family member safety check
    // ------------------------------------------------------------
    /*
     * If the selected recipient is a FamilyProfile,
     * make sure that family member belongs to the
     * guardian/appointment context.
     *
     * This prevents a random FamilyProfile from being used.
     */

    if (citizenType === "family") {
      if (
        citizen.guardianId &&
        linkedAppointment
      ) {
        const appointmentGuardian =
          linkedAppointment.citizenId;

        if (
          String(citizen.guardianId) !==
          String(appointmentGuardian)
        ) {
          return res.status(400).json({
            message:
              "This family member does not belong to the appointment guardian",
          });
        }
      }
    }

    // ------------------------------------------------------------
    // Inventory
    // ------------------------------------------------------------

    const trimmedVaccineType =
      vaccineType.trim();

    const trimmedBatchNumber =
      batchNumber.trim();

    const now = new Date();

    reserved =
      await VaccineInventory.findOneAndUpdate(
        {
          clinicId: user.clinicId,
          vaccineType: trimmedVaccineType,
          batchNumber: trimmedBatchNumber,

          // Batch must not be expired
          expiryDate: {
            $gt: now,
          },

          // At least one stock
          quantity: {
            $gte: 1,
          },
        },
        {
          $inc: {
            quantity: -1,
          },
        },
        {
          new: true,
        }
      );

    // ------------------------------------------------------------
    // Inventory validation error
    // ------------------------------------------------------------

    if (!reserved) {
      const existingBatch =
        await VaccineInventory.findOne({
          clinicId: user.clinicId,
          vaccineType: trimmedVaccineType,
          batchNumber: trimmedBatchNumber,
        });

      if (!existingBatch) {
        return res.status(400).json({
          message:
            "Unknown batch number: no matching batch found in this clinic's inventory",
        });
      }

      if (
        existingBatch.expiryDate <= now
      ) {
        return res.status(400).json({
          message:
            "This batch has expired and cannot be administered",
        });
      }

      return res.status(400).json({
        message:
          "No stock remaining for this batch",
      });
    }

    // ------------------------------------------------------------
    // Create Dose Record
    // ------------------------------------------------------------

    let record;

    try {
      record = await DoseRecord.create({
        citizenId,

        /*
         * User:
         *   "User"
         *
         * Family:
         *   "FamilyProfile"
         */
        citizenType:
          CITIZEN_TYPE_MAP[citizenType],

        vaccineType:
          trimmedVaccineType,

        batchNumber:
          trimmedBatchNumber,

        dateAdministered:
          dateAdministered || undefined,

        healthWorkerId:
          user._id,

        clinicId:
          user.clinicId,

        appointmentId:
          appointmentId || null,
      });
    } catch (createError) {
      // Restore inventory if DoseRecord creation fails
      await VaccineInventory.updateOne(
        {
          _id: reserved._id,
        },
        {
          $inc: {
            quantity: 1,
          },
        }
      );

      reserved = null;

      if (
        createError.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          message:
            createError.message,
        });
      }

      throw createError;
    }

    // ------------------------------------------------------------
    // AUTOMATIC FEEDBACK PROMPT CREATION
    // ------------------------------------------------------------
    // The feedback owner is:
    //   User -> the vaccinated citizen
    //   FamilyProfile -> the family member's guardian
    //
    // Link fields are derived from the dose record. The frontend
    // never gets to choose userId/clinicId/vaccineType.
    let feedback = null;

    try {
      let feedbackUserId = null;

      if (record.citizenType === "User") {
        feedbackUserId = record.citizenId;
      } else if (record.citizenType === "FamilyProfile") {
        const familyMember = await FamilyProfile.findById(
          record.citizenId
        ).select("guardianId");

        feedbackUserId = familyMember?.guardianId || null;
      }

      if (feedbackUserId) {
        feedback = await Feedback.findOneAndUpdate(
          { doseRecordId: record._id },
          {
            $setOnInsert: {
              doseRecordId: record._id,
              appointmentId: record.appointmentId || null,
              clinicId: record.clinicId,
              userId: feedbackUserId,
              citizenId: record.citizenId,
              citizenType: record.citizenType,
              vaccineType: record.vaccineType,
              promptStatus: "Pending",
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );
      }
    } catch (feedbackError) {
      // Feedback must never make a successfully administered dose fail.
      console.error(
        `Feedback prompt creation failed for dose ${record._id}:`,
        feedbackError
      );
    }

    // ------------------------------------------------------------
    // AUTOMATIC CERTIFICATE GENERATION
    // ------------------------------------------------------------

    let certificate = null;

    try {
      /*
       * IMPORTANT:
       *
       * record contains:
       *
       * citizenId
       * citizenType
       *
       * Therefore certificateService can determine whether
       * this certificate belongs to:
       *
       * - User
       * - FamilyProfile
       */

      const issued =
        await certificateService.issueForDose(
          record
        );

      if (
        issued &&
        issued.certificate
      ) {
        certificate =
          await certificateService.buildQrPayload(
            issued.certificate
          );
      }
    } catch (certificateError) {
      console.error(
        `Certificate issuance failed for dose ${record._id}:`,
        certificateError
      );
    }

    // ------------------------------------------------------------
    // Final response
    // ------------------------------------------------------------

    return res.status(201).json({
      message:
        "Dose record created successfully",

      doseRecordId:
        record._id,

      record,

      remainingStock:
        reserved.quantity,

      feedback: feedback
        ? {
            id: feedback._id,
            promptStatus: feedback.promptStatus,
          }
        : null,

      certificate,
    });
  } catch (error) {
    // ------------------------------------------------------------
    // Inventory rollback
    // ------------------------------------------------------------

    if (reserved) {
      try {
        await VaccineInventory.updateOne(
          {
            _id: reserved._id,
          },
          {
            $inc: {
              quantity: 1,
            },
          }
        );
      } catch (rollbackError) {
        console.error(
          "Inventory rollback failed:",
          rollbackError.message
        );
      }
    }

    console.error(
      "Dose record creation error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while creating dose record",
    });
  }
});

/*
|--------------------------------------------------------------------------
| MY HISTORY
|--------------------------------------------------------------------------
| Citizen's own vaccination history only.
|--------------------------------------------------------------------------
*/

router.get(
  "/my-history",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "citizen") {
        return res.status(403).json({
          message:
            "Only citizens can access their vaccination history",
        });
      }

      const doses =
        await DoseRecord.find({
          citizenId: req.user.id,
          citizenType: "User",
        })
          .sort({
            dateAdministered: -1,
          })
          .populate(
            "citizenId",
            "name dateOfBirth relationship email"
          )
          .populate(
            "healthWorkerId",
            "name"
          )
          .populate(
            "clinicId",
            "name location"
          );

      return res.json({
        doses,
      });
    } catch (error) {
      console.error(
        "My vaccination history error:",
        error.message
      );

      return res.status(500).json({
        message:
          "Server error while fetching vaccination history",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET DOSE HISTORY
|--------------------------------------------------------------------------
|
| IMPORTANT FIX:
|
| When a citizen/guardian requests:
|
| GET /doses/citizen/GUARDIAN_ID?citizenType=user
|
| return:
|
| 1. Guardian's own doses
| 2. ALL family member doses belonging to that guardian
|
| This is the main fix for My Certificate.
|--------------------------------------------------------------------------
*/

router.get(
  "/citizen/:citizenId",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        citizenId,
      } = req.params;

      const citizenType =
        req.query.citizenType;

      // ----------------------------------------------------------
      // Validate ID
      // ----------------------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          citizenId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid citizen reference",
        });
      }

      const role = req.user.role;

      // ----------------------------------------------------------
      // Staff/Admin
      // ----------------------------------------------------------

      let allowed =
        role === "admin" ||
        isStaffRole(role);

      // ----------------------------------------------------------
      // Citizen authorization
      // ----------------------------------------------------------

      if (
        !allowed &&
        role === "citizen"
      ) {
        /*
         * Citizen can access:
         *
         * 1. Own User ID
         * 2. Their own FamilyProfile ID
         */

        if (
          String(citizenId) ===
          String(req.user.id)
        ) {
          allowed = true;
        } else {
          const familyMember =
            await FamilyProfile.findOne({
              _id: citizenId,
              guardianId: req.user.id,
            });

          allowed =
            !!familyMember;
        }
      }

      if (!allowed) {
        return res.status(403).json({
          message:
            "You are not allowed to view this vaccination history",
        });
      }

      // ----------------------------------------------------------
      // Validate citizenType
      // ----------------------------------------------------------

      if (citizenType) {
        const modelName =
          CITIZEN_TYPE_MAP[
            citizenType
          ];

        if (!modelName) {
          return res.status(400).json({
            message:
              "citizenType must be either 'user' or 'family'",
          });
        }
      }

      // ==========================================================
      // IMPORTANT FIX FOR GUARDIAN
      // ==========================================================
      //
      // If a citizen requests their own User history:
      //
      // GET /citizen/:userId?citizenType=user
      //
      // we return:
      //
      // own User doses
      // +
      // all FamilyProfile doses
      //
      // belonging to this guardian.
      // ==========================================================

      let doses = [];

      if (
        role === "citizen" &&
        String(citizenId) ===
          String(req.user.id) &&
        citizenType === "user"
      ) {
        // --------------------------------------------------------
        // 1. Get guardian's own doses
        // --------------------------------------------------------

        const ownDoses =
          await DoseRecord.find({
            citizenId: req.user.id,
            citizenType: "User",
          })
            .sort({
              dateAdministered: -1,
            })
            .populate(
              "citizenId",
              "name dateOfBirth relationship email"
            )
            .populate(
              "healthWorkerId",
              "name"
            )
            .populate(
              "clinicId",
              "name location"
            );

        // --------------------------------------------------------
        // 2. Find ALL family members of this guardian
        // --------------------------------------------------------

        const familyMembers =
          await FamilyProfile.find({
            guardianId: req.user.id,
          }).select("_id");

        const familyIds =
          familyMembers.map(
            (member) => member._id
          );

        // --------------------------------------------------------
        // 3. Get doses of all family members
        // --------------------------------------------------------

        let familyDoses = [];

        if (familyIds.length > 0) {
          familyDoses =
            await DoseRecord.find({
              citizenId: {
                $in: familyIds,
              },

              citizenType:
                "FamilyProfile",
            })
              .sort({
                dateAdministered: -1,
              })
              .populate(
                "citizenId",
                "name dateOfBirth relationship email guardianId"
              )
              .populate(
                "healthWorkerId",
                "name"
              )
              .populate(
                "clinicId",
                "name location"
              );
        }

        // --------------------------------------------------------
        // 4. Combine own + family doses
        // --------------------------------------------------------

        doses = [
          ...ownDoses,
          ...familyDoses,
        ];

        // --------------------------------------------------------
        // 5. Sort all together by vaccination date
        // --------------------------------------------------------

        doses.sort(
          (a, b) =>
            new Date(
              b.dateAdministered
            ) -
            new Date(
              a.dateAdministered
            )
        );
      } else {
        // ========================================================
        // NORMAL HISTORY REQUEST
        // ========================================================

        const filter = {
          citizenId,
        };

        if (citizenType) {
          filter.citizenType =
            CITIZEN_TYPE_MAP[
              citizenType
            ];
        }

        doses =
          await DoseRecord.find(filter)
            .sort({
              dateAdministered: -1,
            })
            .populate(
              "citizenId",
              "name dateOfBirth relationship email guardianId"
            )
            .populate(
              "healthWorkerId",
              "name"
            )
            .populate(
              "clinicId",
              "name location"
            );
      }

      // ----------------------------------------------------------
      // Return doses
      // ----------------------------------------------------------

      return res.json({
        doses,
      });
    } catch (error) {
      console.error(
        "Dose history fetch error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching dose history",
      });
    }
  }
);

module.exports = router;