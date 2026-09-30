const crypto = require("crypto");
const mongoose = require("mongoose");

const Certificate = require("../models/Certificate");
const DoseRecord = require("../models/DoseRecord");
const User = require("../models/User");
const FamilyProfile = require("../models/FamilyProfile");

jest.mock("../models/Certificate");
jest.mock("../models/DoseRecord");
jest.mock("../models/User");
jest.mock("../models/FamilyProfile");

const certificateService = require("../services/certificateService");
const qrToken = require("../utils/qrToken");

const dose = {
  _id: new mongoose.Types.ObjectId(),
  citizenId: new mongoose.Types.ObjectId(),
  citizenType: "FamilyProfile",
  dateAdministered: new Date("2026-01-31T00:00:00.000Z"),
};

const DAY = 24 * 60 * 60 * 1000;

const makeCert = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  citizenId: dose.citizenId,
  citizenType: "FamilyProfile",
  doseRecordId: dose._id,
  qrToken: crypto.randomBytes(32).toString("hex"),
  issuedDate: new Date(Date.now() - 2 * DAY),
  expiryDate: new Date(Date.now() + 30 * DAY),
  revokedAt: null,
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  process.env.QR_SIGNING_SECRET = "s".repeat(48);
  process.env.JWT_SECRET = "different-login-secret";
});

describe("issueForDose", () => {
  test("creates a certificate for the dose's citizen", async () => {
    const cert = makeCert();
    Certificate.findOne.mockResolvedValue(null);
    Certificate.create.mockResolvedValue(cert);

    const result = await certificateService.issueForDose(dose);

    expect(result).toEqual({ certificate: cert, created: true });
    expect(Certificate.create).toHaveBeenCalledWith({
      citizenId: dose.citizenId,
      citizenType: "FamilyProfile",
      doseRecordId: dose._id,
      expiryDate: expect.any(Date),
    });
  });

  test("is idempotent: returns the existing certificate without creating another", async () => {
    const cert = makeCert();
    Certificate.findOne.mockResolvedValue(cert);

    const result = await certificateService.issueForDose(dose);

    expect(result).toEqual({ certificate: cert, created: false });
    expect(Certificate.create).not.toHaveBeenCalled();
  });

  test("resolves a concurrent-issue race (duplicate key) to the winner's row", async () => {
    const winner = makeCert();
    Certificate.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    Certificate.create.mockRejectedValue(
      Object.assign(new Error("E11000"), { code: 11000 })
    );

    const result = await certificateService.issueForDose(dose);

    expect(result).toEqual({ certificate: winner, created: false });
  });

  test("propagates unexpected create errors", async () => {
    Certificate.findOne.mockResolvedValue(null);
    Certificate.create.mockRejectedValue(new Error("db down"));

    await expect(certificateService.issueForDose(dose)).rejects.toThrow("db down");
  });

  test("fails before writing anything when signing isn't configured", async () => {
    delete process.env.QR_SIGNING_SECRET;

    await expect(certificateService.issueForDose(dose)).rejects.toThrow(
      qrToken.QrConfigError
    );
    expect(Certificate.findOne).not.toHaveBeenCalled();
    expect(Certificate.create).not.toHaveBeenCalled();
  });
});

describe("buildQrPayload", () => {
  test("returns a signed token and a PNG data URL that encode it", async () => {
    const cert = makeCert();

    const payload = await certificateService.buildQrPayload(cert);

    expect(payload.id).toBe(cert._id);
    expect(payload.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(qrToken.verifyToken(payload.token)).toMatchObject({
      valid: true,
      payload: { tid: cert.qrToken },
    });
  });

  test("never includes the raw lookup id or personal data in the response", async () => {
    const cert = makeCert();

    const payload = await certificateService.buildQrPayload(cert);

    expect(Object.keys(payload).sort()).toEqual(
      ["doseRecordId", "id", "issuedDate", "qrCode", "token"].sort()
    );
  });
});

describe("verifyScannedToken", () => {
  const setupHappyPath = (cert) => {
    Certificate.findOne.mockResolvedValue(cert);
    DoseRecord.findById.mockResolvedValue({ _id: dose._id });
  };

  test("accepts a genuine token and returns only { valid: true }", async () => {
    const cert = makeCert();
    setupHappyPath(cert);
    const { token } = await certificateService.buildQrPayload(cert);

    const result = await certificateService.verifyScannedToken(token);

    expect(result).toEqual({ valid: true });
    expect(Certificate.findOne).toHaveBeenCalledWith({ qrToken: cert.qrToken });
  });

  test("never reads personal data while verifying", async () => {
    const cert = makeCert();
    setupHappyPath(cert);
    const { token } = await certificateService.buildQrPayload(cert);

    await certificateService.verifyScannedToken(token);

    expect(User.findById).not.toHaveBeenCalled();
    expect(FamilyProfile.findById).not.toHaveBeenCalled();
  });

  test("rejects a forged token without touching the database", async () => {
    const result = await certificateService.verifyScannedToken("aaa.bbb.ccc");

    expect(result.valid).toBe(false);
    expect(Certificate.findOne).not.toHaveBeenCalled();
  });

  test("rejects a tampered token without touching the database", async () => {
    const cert = makeCert();
    const { token } = await certificateService.buildQrPayload(cert);
    const [h, p, s] = token.split(".");
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    payload.exp += 365 * 24 * 60 * 60;
    const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${s}`;

    expect(await certificateService.verifyScannedToken(forged)).toEqual({
      valid: false,
      reason: "invalid_signature",
    });
    expect(Certificate.findOne).not.toHaveBeenCalled();
  });

  test("rejects an expired token without touching the database", async () => {
    const cert = makeCert({
      issuedDate: new Date(Date.now() - 20 * DAY),
      expiryDate: new Date(Date.now() - 1 * DAY),
    });
    const { token } = await certificateService.buildQrPayload(cert);

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "expired",
    });
    expect(Certificate.findOne).not.toHaveBeenCalled();
  });

  test("rejects a validly-signed token whose certificate no longer exists", async () => {
    const cert = makeCert();
    const { token } = await certificateService.buildQrPayload(cert);
    Certificate.findOne.mockResolvedValue(null);

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "certificate_not_found",
    });
  });

  test("rejects a token that doesn't match the stored issuance", async () => {
    const cert = makeCert();
    const { token } = await certificateService.buildQrPayload(cert);
    Certificate.findOne.mockResolvedValue({
      ...cert,
      issuedDate: new Date(Date.now() - 1 * DAY),
    });

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "token_mismatch",
    });
  });

  test("rejects a token whose expiry differs from the stored expiry", async () => {
    const cert = makeCert();
    const { token } = await certificateService.buildQrPayload(cert);
    Certificate.findOne.mockResolvedValue({
      ...cert,
      expiryDate: new Date(Date.now() + 90 * DAY),
    });

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "token_mismatch",
    });
  });

  test("rejects a revoked certificate even though the signature is good", async () => {
    const cert = makeCert({ revokedAt: new Date() });
    const { token } = await certificateService.buildQrPayload(cert);
    Certificate.findOne.mockResolvedValue(cert);

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "revoked",
    });
  });

  test("rejects when the underlying dose record is gone", async () => {
    const cert = makeCert();
    const { token } = await certificateService.buildQrPayload(cert);
    Certificate.findOne.mockResolvedValue(cert);
    DoseRecord.findById.mockResolvedValue(null);

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "dose_record_not_found",
    });
  });
});
