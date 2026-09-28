const Certificate = require("../models/Certificate");
const { signToken, verifyToken } = require("../utils/certificateToken");

// =====================================================
// ISSUE (idempotent: one certificate per dose record)
// =====================================================
async function issueCertificateForDose(doseRecord) {
  const existing = await Certificate.findOne({ doseRecordId: doseRecord._id });

  if (existing) return existing;

  try {
    return await Certificate.create({
      citizenId: doseRecord.citizenId,
      citizenType: doseRecord.citizenType,
      doseRecordId: doseRecord._id,
    });
  } catch (error) {
    // Two requests raced past the findOne above; the unique index on
    // doseRecordId let only one win. Return the winner.
    if (error.code === 11000) {
      const winner = await Certificate.findOne({
        doseRecordId: doseRecord._id,
      });

      if (winner) return winner;
    }

    throw error;
  }
}

// =====================================================
// QR CODE
// What gets encoded: the signed token, or a verify URL that contains it
// when CERT_VERIFY_BASE_URL is set (so a phone camera opens the page).
// =====================================================
function buildQrPayload(signedToken) {
  const baseUrl = (process.env.CERT_VERIFY_BASE_URL || "").replace(/\/+$/, "");

  return baseUrl ? `${baseUrl}/verify/${signedToken}` : signedToken;
}

async function getCertificateQr(certificate) {
  // Required lazily so the signing/verification code works (and can be
  // tested) without the qrcode package loaded.
  const QRCode = require("qrcode");

  const token = signToken(certificate.qrToken);

  const qrDataUrl = await QRCode.toDataURL(buildQrPayload(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });

  return { token, qrDataUrl };
}

// =====================================================
// VERIFY
// Step 1: check the signature (no DB hit for forgeries)
// Step 2: confirm the certificate exists and return public details
// =====================================================
async function verifyCertificate(token) {
  const parsed = verifyToken(token);

  if (!parsed.valid) {
    return { valid: false, status: 400, reason: parsed.reason };
  }

  const certificate = await Certificate.findOne({ qrToken: parsed.qrToken })
    .populate("citizenId", "name")
    .populate({
      path: "doseRecordId",
      populate: { path: "clinicId", select: "name location" },
    });

  if (!certificate) {
    return { valid: false, status: 404, reason: "Certificate not found" };
  }

  const dose = certificate.doseRecordId;

  if (!dose) {
    return {
      valid: false,
      status: 404,
      reason: "The dose record for this certificate no longer exists",
    };
  }

  // Only what a verifier needs; no email, DOB or internal ids.
  return {
    valid: true,
    status: 200,
    certificate: {
      issuedDate: certificate.issuedDate,
      citizenName: certificate.citizenId ? certificate.citizenId.name : null,
      vaccineType: dose.vaccineType,
      batchNumber: dose.batchNumber,
      dateAdministered: dose.dateAdministered,
      clinicName: dose.clinicId ? dose.clinicId.name : null,
    },
  };
}

module.exports = {
  issueCertificateForDose,
  getCertificateQr,
  verifyCertificate,
};