
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../models/CatchUpSchedule", () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../models/FamilyProfile", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../../models/VaccineSchedule", () => ({
  find: jest.fn(),
}));

jest.mock("../../models/DoseRecord", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../models/Appointment", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../models/Notification", () => ({
  updateOne: jest.fn(),
}));

const CatchUpSchedule = require("../../models/CatchUpSchedule");
const FamilyProfile = require("../../models/FamilyProfile");
const User = require("../../models/User");
const VaccineSchedule = require("../../models/VaccineSchedule");
const DoseRecord = require("../../models/DoseRecord");
const Appointment = require("../../models/Appointment");
const Notification = require("../../models/Notification");
const recoveryRoutes = require("../../routes/recoveryRoutes");

const app = express();
app.use(express.json());
app.use("/api/recovery", recoveryRoutes);

const guardianId = "651111111111111111111111";
const otherGuardianId = "655555555555555555555555";
const recoveryId = "652222222222222222222222";
const vaccineId = "653333333333333333333333";

const auth = (id = guardianId) => ({
  Authorization: `Bearer ${jwt.sign(
    { _id: id },
    "m12-test-secret"
  )}`,
});

function makeRecovery(overrides = {}) {
  return {
    _id: recoveryId,
    guardianId,
    profileId: guardianId,
    profileType: "User",
    vaccineId,
    doseNumber: 2,
    originalDueDate: new Date("2026-08-01T00:00:00.000Z"),
    status: "Missed",
    reasonCode: "not_provided",
    reasonDetails: "",
    suggestedDueDate: null,
    scheduleGeneratedAt: null,
    save: jest.fn().mockImplementation(async function () {
      return this;
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  process.env.JWT_SECRET = "m12-test-secret";
  process.env.APP_TIMEZONE = "Asia/Dhaka";

  Notification.updateOne.mockResolvedValue({
    acknowledged: true,
    upsertedCount: 1,
  });
});

describe("M12 - Recovery and Catch-up Schedule", () => {
  test("TC-U56: saves a valid missed-dose reason", async () => {
    const row = makeRecovery();
    CatchUpSchedule.findById.mockResolvedValue(row);

    const response = await request(app)
      .patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth())
      .send({
        reasonCode: "travel",
        reasonDetails: "Family travel",
      });

    expect(response.status).toBe(200);
    expect(row.reasonCode).toBe("travel");
    expect(row.reasonDetails).toBe("Family travel");
    expect(row.reportedBy).toBe(guardianId);
    expect(row.save).toHaveBeenCalled();
  });

  test("TC-U57: rejects an invalid reason code", async () => {
    CatchUpSchedule.findById.mockResolvedValue(makeRecovery());

    const response = await request(app)
      .patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth())
      .send({ reasonCode: "invalid_reason" });

    expect(response.status).toBe(400);
  });

  test("TC-U58: requires details when reason is other", async () => {
    CatchUpSchedule.findById.mockResolvedValue(makeRecovery());

    const response = await request(app)
      .patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth())
      .send({
        reasonCode: "other",
        reasonDetails: "   ",
      });

    expect(response.status).toBe(400);
  });

  test("TC-U59: blocks another guardian from changing the reason", async () => {
    CatchUpSchedule.findById.mockResolvedValue(makeRecovery());

    const response = await request(app)
      .patch(`/api/recovery/${recoveryId}/reason`)
      .set(auth(otherGuardianId))
      .send({ reasonCode: "travel" });

    expect(response.status).toBe(403);
  });

  test("TC-U60: returns ReviewRequired when no approved vaccine rule exists", async () => {
    const row = makeRecovery();
    CatchUpSchedule.findById.mockResolvedValue(row);

    VaccineSchedule.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    const response = await request(app)
      .post(`/api/recovery/${recoveryId}/generate-schedule`)
      .set(auth())
      .send();

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ReviewRequired");
    expect(row.status).toBe("ReviewRequired");
    expect(row.suggestedDueDate).toBeNull();
    expect(row.save).toHaveBeenCalled();
    expect(Notification.updateOne).toHaveBeenCalled();
  });

  test("rejects an invalid recovery schedule ID", async () => {
    const response = await request(app)
      .patch("/api/recovery/invalid-id/reason")
      .set(auth())
      .send({ reasonCode: "travel" });

    expect(response.status).toBe(400);
  });
});
