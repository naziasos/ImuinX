const Certificate = require("../models/Certificate");
const { signToken, verifyToken } = require("../utils/certificateToken");
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
    if (error.code === 11000) {
      const winner = await Certificate.findOne({
        doseRecordId: doseRecord._id,
      });

      if (winner) return winner;
    }

    throw error;
  }
}

function buildQrPayload(signedToken) {
  const baseUrl = (process.env.CERT_VERIFY_BASE_URL || "").replace(/\/+$/, "");

  return baseUrl ? `${baseUrl}/verify/${signedToken}` : signedToken;
}

async function getCertificateQr(certificate) {

  const QRCode = require("qrcode");

  const token = signToken(certificate.qrToken);

  const qrDataUrl = await QRCode.toDataURL(buildQrPayload(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });

  return { token, qrDataUrl };
}

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