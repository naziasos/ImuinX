const request = require("supertest");
const express = require("express");

const User = require("../models/User");
const DoseRecord = require("../models/DoseRecord");
const FamilyProfile = require("../models/FamilyProfile");
const Certificate = require("../models/Certificate");
const certificateService = require("../services/certificateService");
const { QrConfigError } = require("../utils/qrToken");

jest.mock("../models/User");
jest.mock("../models/DoseRecord");
jest.mock("../models/FamilyProfile");
jest.mock("../models/Certificate");
jest.mock("../services/certificateService");

let mockActingUser = { id: "u1", role: "worker" };
jest.mock("../middleware/authMiddleware", () => (req, res, next) => {
  req.user = mockActingUser;
  next();
});

const certificateRoutes = require("../routes/certificateRoutes");

const app = express();
app.use(express.json());
app.use("/api/certificates", certificateRoutes);

const DOSE_ID = "64b7f7f7f7f7f7f7f7f7f7f7";

const doseOfClinic = (extra = {}) => ({
  _id: DOSE_ID,
  clinicId: "clinic-1",
  citizenId: "citizen-1",
  citizenType: "User",
  ...extra,
});

const qrPayload = { id: "cert-1", token: "t", qrCode: "data:image/png;base64,AA" };

beforeEach(() => {
  jest.resetAllMocks();
  mockActingUser = { id: "u1", role: "worker" };
});

describe("POST /api/certificates/verify (public)", () => {
  test("returns the service's verdict", async () => {
    certificateService.verifyScannedToken.mockResolvedValue({ valid: true });

    const res = await request(app)
      .post("/api/certificates/verify")
      .send({ token: "abc" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true });
    expect(certificateService.verifyScannedToken).toHaveBeenCalledWith("abc");
  });

  test("an invalid token is a 200 with only valid:false (no reason leaked)", async () => {
    certificateService.verifyScannedToken.mockResolvedValue({
      valid: false,
      reason: "invalid_signature",
    });

    const res = await request(app)
      .post("/api/certificates/verify")
      .send({ token: "forged" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false });
  });

  test("never returns more than the valid flag, even if the service does", async () => {
    certificateService.verifyScannedToken.mockResolvedValue({
      valid: true,
      holder: { name: "Someone" },
      dose: { vaccineType: "MMR" },
    });

    const res = await request(app)
      .post("/api/certificates/verify")
      .send({ token: "abc" });

    expect(res.body).toEqual({ valid: true });
  });

  test("trims whitespace around a manually typed code", async () => {
    certificateService.verifyScannedToken.mockResolvedValue({ valid: true });

    await request(app)
      .post("/api/certificates/verify")
      .send({ token: "  abc  " });

    expect(certificateService.verifyScannedToken).toHaveBeenCalledWith("abc");
  });

  test.each([{}, { token: "" }, { token: "   " }, { token: 123 }, { token: {} }])(
    "400 when token is missing or not a string: %j",
    async (body) => {
      const res = await request(app).post("/api/certificates/verify").send(body);

      expect(res.status).toBe(400);
      expect(certificateService.verifyScannedToken).not.toHaveBeenCalled();
    }
  );

  test("500 with a generic message when signing is misconfigured", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    certificateService.verifyScannedToken.mockRejectedValue(
      new QrConfigError("QR_SIGNING_SECRET must be set")
    );

    const res = await request(app)
      .post("/api/certificates/verify")
      .send({ token: "abc" });

    expect(res.status).toBe(500);
    expect(res.body.message).not.toMatch(/QR_SIGNING_SECRET/); // no config leakage
    spy.mockRestore();
  });

  test("rate-limits repeated verification attempts from one client", async () => {
    certificateService.verifyScannedToken.mockResolvedValue({ valid: false });

    const statuses = [];
    for (let i = 0; i < 40; i++) {
      const res = await request(app)
        .post("/api/certificates/verify")
        .send({ token: "guess" });
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
  });
});

describe("GET /api/certificates/dose/:doseRecordId", () => {
  const mockUser = (u) => User.findById.mockResolvedValue({ _id: "u1", ...u });

  test("staff of the issuing clinic can fetch the certificate + QR", async () => {
    mockUser({ role: "worker", clinicId: "clinic-1" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic());
    Certificate.findOne.mockResolvedValue({ _id: "cert-1" });
    certificateService.buildQrPayload.mockResolvedValue(qrPayload);

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.certificate).toEqual(qrPayload);
  });

  test("the citizen can fetch their own certificate", async () => {
    mockUser({ role: "citizen" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic({ citizenId: "u1" }));
    Certificate.findOne.mockResolvedValue({ _id: "cert-1" });
    certificateService.buildQrPayload.mockResolvedValue(qrPayload);

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(200);
  });

  test("a guardian can fetch a family member's certificate", async () => {
    mockUser({ role: "citizen" });
    DoseRecord.findById.mockResolvedValue(
      doseOfClinic({ citizenType: "FamilyProfile" })
    );
    FamilyProfile.findOne.mockResolvedValue({ _id: "citizen-1" });
    Certificate.findOne.mockResolvedValue({ _id: "cert-1" });
    certificateService.buildQrPayload.mockResolvedValue(qrPayload);

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(200);
    expect(FamilyProfile.findOne).toHaveBeenCalledWith({
      _id: "citizen-1",
      guardianId: "u1",
    });
  });

  test("403 for another citizen", async () => {
    mockUser({ role: "citizen" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic({ citizenId: "someone-else" }));

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(403);
    expect(certificateService.buildQrPayload).not.toHaveBeenCalled();
  });

  test("403 for a non-guardian on a family member's certificate", async () => {
    mockUser({ role: "citizen" });
    DoseRecord.findById.mockResolvedValue(
      doseOfClinic({ citizenType: "FamilyProfile" })
    );
    FamilyProfile.findOne.mockResolvedValue(null);

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(403);
  });

  test("403 for staff of a different clinic", async () => {
    mockUser({ role: "worker", clinicId: "clinic-2" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic({ citizenId: "other" }));

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(403);
  });

  test("404 when no certificate has been issued", async () => {
    mockUser({ role: "admin" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic());
    Certificate.findOne.mockResolvedValue(null);

    const res = await request(app).get(`/api/certificates/dose/${DOSE_ID}`);

    expect(res.status).toBe(404);
  });

  test("400 for a malformed id, 404 for an unknown dose", async () => {
    expect((await request(app).get("/api/certificates/dose/nope")).status).toBe(400);

    mockUser({ role: "admin" });
    DoseRecord.findById.mockResolvedValue(null);
    expect((await request(app).get(`/api/certificates/dose/${DOSE_ID}`)).status).toBe(404);
  });
});

describe("POST /api/certificates/dose/:doseRecordId/issue", () => {
  test("staff of the clinic can issue: 201 when new", async () => {
    User.findById.mockResolvedValue({ _id: "u1", role: "clinicAdmin", clinicId: "clinic-1" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic());
    certificateService.issueForDose.mockResolvedValue({
      certificate: { _id: "cert-1" },
      created: true,
    });
    certificateService.buildQrPayload.mockResolvedValue(qrPayload);

    const res = await request(app).post(`/api/certificates/dose/${DOSE_ID}/issue`);

    expect(res.status).toBe(201);
    expect(res.body.certificate).toEqual(qrPayload);
  });

  test("200 when it already existed (idempotent)", async () => {
    User.findById.mockResolvedValue({ _id: "u1", role: "worker", clinicId: "clinic-1" });
    DoseRecord.findById.mockResolvedValue(doseOfClinic());
    certificateService.issueForDose.mockResolvedValue({
      certificate: { _id: "cert-1" },
      created: false,
    });
    certificateService.buildQrPayload.mockResolvedValue(qrPayload);

    const res = await request(app).post(`/api/certificates/dose/${DOSE_ID}/issue`);

    expect(res.status).toBe(200);
  });

  test.each([
    ["a citizen", { role: "citizen" }],
    ["an admin", { role: "admin" }],
    ["staff of another clinic", { role: "worker", clinicId: "clinic-2" }],
  ])("403 for %s", async (_label, user) => {
    User.findById.mockResolvedValue({ _id: "u1", ...user });
    DoseRecord.findById.mockResolvedValue(doseOfClinic());

    const res = await request(app).post(`/api/certificates/dose/${DOSE_ID}/issue`);

    expect(res.status).toBe(403);
    expect(certificateService.issueForDose).not.toHaveBeenCalled();
  });
});
