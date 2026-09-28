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
};

const makeCert = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  citizenId: dose.citizenId,
  citizenType: "FamilyProfile",
  doseRecordId: dose._id,
  qrToken: crypto.randomBytes(32).toString("hex"),
  issuedDate: new Date("2026-02-01T08:30:00.000Z"),
  ...overrides,
});

const chain = (method, value) => ({ [method]: jest.fn().mockResolvedValue(value) });

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
    DoseRecord.findById.mockReturnValue(
      chain("populate", {
        vaccineType: "MMR",
        batchNumber: "B-1",
        dateAdministered: new Date("2026-01-31"),
        clinicId: { name: "City Clinic", location: "Dhaka" },
      })
    );
    FamilyProfile.findById.mockReturnValue(chain("select", { name: "Alfi Jr." }));
  };

  test("accepts a genuine token and returns limited details", async () => {
    const cert = makeCert();
    setupHappyPath(cert);
    const { token } = await certificateService.buildQrPayload(cert);

    const result = await certificateService.verifyScannedToken(token);

    expect(result).toEqual({
      valid: true,
      certificate: { id: cert._id, issuedDate: cert.issuedDate },
      holder: { name: "Alfi Jr.", type: "family" },
      dose: {
        vaccineType: "MMR",
        batchNumber: "B-1",
        dateAdministered: new Date("2026-01-31"),
      },
      clinic: { name: "City Clinic", location: "Dhaka" },
    });
    expect(Certificate.findOne).toHaveBeenCalledWith({ qrToken: cert.qrToken });
  });

  test("looks the holder up in User for User certificates", async () => {
    const cert = makeCert({ citizenType: "User" });
    setupHappyPath(cert);
    User.findById.mockReturnValue(chain("select", { name: "Alfi" }));
    const { token } = await certificateService.buildQrPayload(cert);

    const result = await certificateService.verifyScannedToken(token);

    expect(result.holder).toEqual({ name: "Alfi", type: "user" });
    expect(FamilyProfile.findById).not.toHaveBeenCalled();
  });

  test("rejects a forged token without touching the database", async () => {
    const result = await certificateService.verifyScannedToken("aaa.bbb.ccc");

    expect(result.valid).toBe(false);
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
      issuedDate: new Date("2026-03-01T00:00:00Z"),
    });

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "token_mismatch",
    });
  });

  test("rejects when the underlying dose record is gone", async () => {
    const cert = makeCert();
    const { token } = await certificateService.buildQrPayload(cert);
    Certificate.findOne.mockResolvedValue(cert);
    DoseRecord.findById.mockReturnValue(chain("populate", null));

    expect(await certificateService.verifyScannedToken(token)).toEqual({
      valid: false,
      reason: "dose_record_not_found",
    });
  });
});
