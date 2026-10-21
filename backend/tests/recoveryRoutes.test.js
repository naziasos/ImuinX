jest.mock("../models/CatchUpSchedule", () => ({
  find: jest.fn(), findById: jest.fn(),
}));
jest.mock("../models/FamilyProfile", () => ({
  findById: jest.fn(), findOne: jest.fn(),
}));
jest.mock("../models/User", () => ({ findById: jest.fn() }));
jest.mock("../models/VaccineSchedule", () => ({ find: jest.fn() }));
jest.mock("../models/DoseRecord", () => ({ findOne: jest.fn(), find: jest.fn() }));
jest.mock("../models/Appointment", () => ({ findOne: jest.fn() }));
jest.mock("../models/Vaccine", () => ({ findById: jest.fn() }));

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const CatchUpSchedule = require("../models/CatchUpSchedule");
const FamilyProfile = require("../models/FamilyProfile");
const User = require("../models/User");
const VaccineSchedule = require("../models/VaccineSchedule");
const DoseRecord = require("../models/DoseRecord");
const Appointment = require("../models/Appointment");
const Vaccine = require("../models/Vaccine");
const recoveryRoutes = require("../routes/recoveryRoutes");

const app = express();
app.use(express.json());
app.use("/api/recovery", recoveryRoutes);

const userId = "651111111111111111111111";
const recoveryId = "652222222222222222222222";
const vaccineId = "653333333333333333333333";
const previousDoseId = "654444444444444444444444";

function token(id = userId) {
  return jwt.sign({ _id: id }, process.env.JWT_SECRET || "test-secret");
}
function auth(id = userId) {
  return { Authorization: `Bearer ${token(id)}` };
}
function query(value) {
  return { select: jest.fn().mockResolvedValue(value) };
}
function recovery(overrides = {}) {
  return {
    _id: recoveryId,
    guardianId: userId,
    profileId: userId,
    profileType: "User",
    vaccineId,
    doseNumber: 2,
    originalDueDate: new Date("2026-08-01T00:00:00.000Z"),
    status: "Missed",
    reasonCode: "not_provided",
    suggestedDueDate: null,
    save: jest.fn().mockImplementation(async function () { return this; }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "test-secret";
  process.env.APP_TIMEZONE = "Asia/Dhaka";
});

describe("Recovery reason and catch-up API", () => {
  test("validates reason and requires details for other", async () => {
    CatchUpSchedule.findById.mockResolvedValue(recovery());
    const response = await request(app).patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth()).send({ reasonCode: "other", reasonDetails: " " });
    expect(response.status).toBe(400);
  });

  test("saves a valid reason for the authenticated guardian", async () => {
    const row = recovery();
    CatchUpSchedule.findById.mockResolvedValue(row);
    const response = await request(app).patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth()).send({ reasonCode: "travel", reasonDetails: "Family travel" });
    expect(response.status).toBe(200);
    expect(row.reasonCode).toBe("travel");
    expect(row.reportedBy).toBe(userId);
    expect(row.save).toHaveBeenCalled();
  });

  test("blocks another account from changing the reason", async () => {
    CatchUpSchedule.findById.mockResolvedValue(recovery());
    const response = await request(app).patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth("655555555555555555555555"))
      .send({ reasonCode: "travel" });
    expect(response.status).toBe(403);
  });

  test("returns ReviewRequired if no approved rule exists", async () => {
    const row = recovery();
    CatchUpSchedule.findById.mockResolvedValue(row);
    VaccineSchedule.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const response = await request(app).post(`/api/recovery/${recoveryId}/generate-schedule`)
      .set(auth()).send();
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ReviewRequired");
    expect(row.suggestedDueDate).toBeNull();
  });

  test("suggested date respects the approved minimum interval and repeated calls reuse it", async () => {
    const row = recovery();
    CatchUpSchedule.findById.mockResolvedValue(row);
    const rule = {
      _id: "656666666666666666666666",
      guidelineSource: "Approved national schedule",
      guidelineVersion: "2026-v1",
      doses: [{ doseNumber: 1, minIntervalDays: null }, { doseNumber: 2, minIntervalDays: 28 }],
    };
    VaccineSchedule.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([rule]) });
    Vaccine.findById.mockReturnValue(query({ name: "OPV", code: "OPV" }));
    DoseRecord.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({
        _id: previousDoseId,
        dateAdministered: new Date("2026-10-01T00:00:00.000Z"),
      }),
    });

    const first = await request(app).post(`/api/recovery/${recoveryId}/generate-schedule`)
      .set(auth()).send();
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("ScheduleReady");
    expect(new Date(first.body.suggestedDueDate).getTime()).toBeGreaterThanOrEqual(
      new Date("2026-10-29T00:00:00.000Z").getTime()
    );

    row.status = "ScheduleReady";
    row.suggestedDueDate = new Date(first.body.suggestedDueDate);
    const second = await request(app).post(`/api/recovery/${recoveryId}/generate-schedule`)
      .set(auth()).send();
    expect(second.status).toBe(200);
    expect(second.body.reused).toBe(true);
    expect(VaccineSchedule.find).toHaveBeenCalledTimes(1);
  });
});
