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

const VERIFY_WINDOW_MS = 60 * 1000;
const VERIFY_MAX_PER_WINDOW = 30;
const verifyHits = new Map();

function verifyRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || "unknown";
  const entry = verifyHits.get(key);

  if (!entry || now - entry.start >= VERIFY_WINDOW_MS) {
    verifyHits.set(key, { start: now, count: 1 });
  } else if (++entry.count > VERIFY_MAX_PER_WINDOW) {
    return res
      .status(429)
      .json({ message: "Too many verification attempts. Try again shortly." });
  }

  if (verifyHits.size > 5000) {
    for (const [k, v] of verifyHits) {
      if (now - v.start >= VERIFY_WINDOW_MS) verifyHits.delete(k);
    }
  }

  next();
}

router.post("/verify", verifyRateLimit, async (req, res) => {
  const token = req.body && req.body.token;

  if (typeof token !== "string" || !token.trim()) {
    return res.status(400).json({ message: "A QR token is required" });
  }

  try {
    const result = await certificateService.verifyScannedToken(token.trim());

    return res.status(200).json({ valid: result.valid === true });
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

    const payload = await certificateService.buildQrPayload(
      certificate,
      dose.dateAdministered
    );

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
      issued.certificate,
      dose.dateAdministered
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
