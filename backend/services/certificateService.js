const QRCode = require("qrcode");

const Certificate = require("../models/Certificate");
const DoseRecord = require("../models/DoseRecord");
const User = require("../models/User");
const FamilyProfile = require("../models/FamilyProfile");

const qrToken = require("../utils/qrToken");

const MONGO_DUPLICATE_KEY = 11000;
 
async function issueForDose(doseRecord) {
  qrToken.assertConfigured();

  const existing = await Certificate.findOne({ doseRecordId: doseRecord._id });

  if (existing) {
    return { certificate: existing, created: false };
  }

  try {
    const certificate = await Certificate.create({
      citizenId: doseRecord.citizenId,
      citizenType: doseRecord.citizenType,
      doseRecordId: doseRecord._id,
    });

    return { certificate, created: true };
  } catch (error) {
    if (error && error.code === MONGO_DUPLICATE_KEY) {
      const winner = await Certificate.findOne({
        doseRecordId: doseRecord._id,
      });

      if (winner) {
        return { certificate: winner, created: false };
      }
    }

    throw error;
  }
}


async function buildQrPayload(certificate) {
  const token = qrToken.signToken(certificate.qrToken, certificate.issuedDate);

  const qrCode = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return {
    id: certificate._id,
    doseRecordId: certificate.doseRecordId,
    issuedDate: certificate.issuedDate,
    token,
    qrCode, 
  };
}

async function verifyScannedToken(token) {
  const check = qrToken.verifyToken(token);

  if (!check.valid) {
    return { valid: false, reason: check.reason };
  }

  const { tid, iat } = check.payload;

  const certificate = await Certificate.findOne({ qrToken: tid });

  if (!certificate) {
    return { valid: false, reason: "certificate_not_found" };
  }

  if (Math.floor(certificate.issuedDate.getTime() / 1000) !== iat) {
    return { valid: false, reason: "token_mismatch" };
  }

  const dose = await DoseRecord.findById(certificate.doseRecordId).populate(
    "clinicId",
    "name location"
  );

  if (!dose) {
    return { valid: false, reason: "dose_record_not_found" };
  }

  const CitizenModel =
    certificate.citizenType === "User" ? User : FamilyProfile;

  const citizen = await CitizenModel.findById(certificate.citizenId).select(
    "name"
  );

  return {
    valid: true,
    certificate: {
      id: certificate._id,
      issuedDate: certificate.issuedDate,
    },
    holder: {
      name: citizen ? citizen.name : null,
      type: certificate.citizenType === "User" ? "user" : "family",
    },
    dose: {
      vaccineType: dose.vaccineType,
      batchNumber: dose.batchNumber,
      dateAdministered: dose.dateAdministered,
    },
    clinic: dose.clinicId
      ? { name: dose.clinicId.name, location: dose.clinicId.location }
      : null,
  };
}

module.exports = { issueForDose, buildQrPayload, verifyScannedToken };
