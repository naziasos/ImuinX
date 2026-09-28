const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const DoseRecord = require("../models/DoseRecord");
const FamilyProfile = require("../models/FamilyProfile");
const Certificate = require("../models/Certificate");

const authMiddleware = require("../middleware/authMiddleware");
const certificateService = require("../services/certificateService");

const router = express.Router();

function isStaff(user) {
  return user && (user.role === "worker" || user.role === "clinicAdmin");
}

router.post("/verify", async (req, res) => {
  const { token } = req.body;

  if (typeof token !== "string" || !token.trim()) {
    return res.status(400).json({ message: "A QR token is required" });
  }

  try {
    const result = await certificateService.verifyScannedToken(token.trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error("Certificate verification error:", error.message);
    return res.status(500).json({
      message: "Unable to verify certificate",
    });
  }
});

router.get("/dose/:doseRecordId", authMiddleware, async (req, res) => {
  try {
    const { doseRecordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doseRecordId)) {
      return res.status(400).json({ message: "Invalid dose record id" });
    }

    const dose = await DoseRecord.findById(doseRecordId);

    if (!dose) {
      return res.status(404).json({ message: "Dose record not found" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let allowed = false;

    if (user.role === "admin") {
      allowed = true;
    }

    if (isStaff(user)) {
      allowed =
        user.clinicId &&
        dose.clinicId &&
        String(user.clinicId) === String(dose.clinicId);
    }

    if (user.role === "citizen" && dose.citizenType === "User") {
      allowed = String(dose.citizenId) === String(user._id);
    }

    if (user.role === "citizen" && dose.citizenType === "FamilyProfile") {
      const familyMember = await FamilyProfile.findOne({
        _id: dose.citizenId,
        guardianId: user._id,
      });
      allowed = !!familyMember;
    }

    if (!allowed) {
      return res.status(403).json({
        message: "You are not allowed to access this certificate",
      });
    }

    const certificate = await Certificate.findOne({ doseRecordId });

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate has not been issued for this dose yet",
      });
    }

    const payload = await certificateService.buildQrPayload(certificate);

    return res.status(200).json({ certificate: payload });
  } catch (error) {
    console.error("Certificate fetch error:", error.message);
    return res.status(500).json({
      message: "Server error while fetching certificate",
    });
  }
});

router.post("/dose/:doseRecordId/issue", authMiddleware, async (req, res) => {
  try {
    const { doseRecordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doseRecordId)) {
      return res.status(400).json({ message: "Invalid dose record id" });
    }

    const user = await User.findById(req.user.id);

    if (!user || !isStaff(user)) {
      return res.status(403).json({
        message: "Only clinic staff can issue a certificate",
      });
    }

    const dose = await DoseRecord.findById(doseRecordId);

    if (!dose) {
      return res.status(404).json({ message: "Dose record not found" });
    }

    if (
      !user.clinicId ||
      !dose.clinicId ||
      String(user.clinicId) !== String(dose.clinicId)
    ) {
      return res.status(403).json({
        message: "You are not allowed to issue this certificate",
      });
    }

    const issued = await certificateService.issueForDose(dose);
    const payload = await certificateService.buildQrPayload(
      issued.certificate
    );

    return res.status(issued.created ? 201 : 200).json({
      certificate: payload,
    });
  } catch (error) {
    console.error("Certificate issue error:", error.message);
    return res.status(500).json({
      message: "Server error while issuing certificate",
    });
  }
});

module.exports = router;
