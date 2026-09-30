const QRCode = require("qrcode");

const Certificate = require("../models/Certificate");
const DoseRecord = require("../models/DoseRecord");

const qrToken = require("../utils/qrToken");

const MONGO_DUPLICATE_KEY = 11000;
const CERTIFICATE_VALIDITY_DAYS = Number(
  process.env.CERTIFICATE_VALIDITY_DAYS || 365
);

async function issueForDose(doseRecord) {
  qrToken.assertConfigured();

  const existing = await Certificate.findOne({ doseRecordId: doseRecord._id });

  if (existing) {
    return { certificate: existing, created: false };
  }

  const expiryDate = new Date(doseRecord.dateAdministered);
  expiryDate.setDate(expiryDate.getDate() + CERTIFICATE_VALIDITY_DAYS);

  try {
    const certificate = await Certificate.create({
      citizenId: doseRecord.citizenId,
      citizenType: doseRecord.citizenType,
      doseRecordId: doseRecord._id,
      expiryDate,
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

async function buildQrPayload(certificate, fallbackDate = null) {

  let expiryDate = certificate.expiryDate;
  const existingExpiryMs = expiryDate ? new Date(expiryDate).getTime() : NaN;

  if (Number.isNaN(existingExpiryMs)) {
    const baseDate = fallbackDate || certificate.issuedDate;
    const baseMs = new Date(baseDate).getTime();

    if (Number.isNaN(baseMs)) {
      throw new TypeError("issuedDate must be a valid date");
    }

    expiryDate = new Date(baseMs);
    expiryDate.setDate(expiryDate.getDate() + CERTIFICATE_VALIDITY_DAYS);

    await Certificate.collection.updateOne(
      {
        _id: certificate._id,
        $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }],
      },
      { $set: { expiryDate } }
    );
  }

  const token = qrToken.signToken(
    certificate.qrToken,
    certificate.issuedDate,
    expiryDate
  );

  const qrCode = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return {
    id: certificate._id,
    doseRecordId: certificate.doseRecordId,
    issuedDate: certificate.issuedDate,
    expiryDate,
    token,
    qrCode,
  };
}

async function verifyScannedToken(token) {
  const check = qrToken.verifyToken(token);

  if (!check.valid) {
    return { valid: false, reason: check.reason };
  }

  const { tid, iat, exp } = check.payload;

  const certificate = await Certificate.findOne({ qrToken: tid });

  if (!certificate) {
    return { valid: false, reason: "certificate_not_found" };
  }

  if (
    Math.floor(new Date(certificate.issuedDate).getTime() / 1000) !== iat ||
    Math.floor(new Date(certificate.expiryDate).getTime() / 1000) !== exp
  ) {
    return { valid: false, reason: "token_mismatch" };
  }

  if (certificate.revokedAt) {
    return { valid: false, reason: "revoked" };
  }

  if (new Date(certificate.expiryDate).getTime() <= Date.now()) {
    return { valid: false, reason: "expired" };
  }


  const dose = await DoseRecord.findById(certificate.doseRecordId);

  if (!dose) {
    return { valid: false, reason: "dose_record_not_found" };
  }

  return { valid: true };
}

module.exports = { issueForDose, buildQrPayload, verifyScannedToken };