// Unit tests for T9.2. All database models are mocked, so these tests do not
// require MongoDB and never create/update real project data.
jest.mock("../models/User", () => ({ find: jest.fn() }));
jest.mock("../models/FamilyProfile", () => ({ find: jest.fn() }));
jest.mock("../models/VaccineSchedule", () => ({ find: jest.fn() }));
jest.mock("../models/DoseRecord", () => ({ find: jest.fn() }));
jest.mock("../models/Appointment", () => ({ find: jest.fn(), findOne: jest.fn() }));
jest.mock("../models/CatchUpSchedule", () => ({ findOneAndUpdate: jest.fn(), findOne: jest.fn() }));
jest.mock("../models/Notification", () => ({ updateOne: jest.fn() }));

const User = require("../models/User");
const FamilyProfile = require("../models/FamilyProfile");
const VaccineSchedule = require("../models/VaccineSchedule");
const DoseRecord = require("../models/DoseRecord");
const Appointment = require("../models/Appointment");
const CatchUpSchedule = require("../models/CatchUpSchedule");
const Notification = require("../models/Notification");
const missedDoseJob = require("../jobs/missedDoseDetection");

const NOW = new Date("2026-10-20T06:00:00.000Z");
const citizenId = "651111111111111111111111";
const vaccineId = "652222222222222222222222";
const scheduleId = "653333333333333333333333";
const catchUpId = "654444444444444444444444";

function resolvedQuery(value) {
  return { select: jest.fn().mockResolvedValue(value) };
}

function configureBase({ records = [], activeAppointment = null, catchUpStatus = "Missed" } = {}) {
  User.find.mockReturnValue(resolvedQuery([
    { _id: citizenId, dateOfBirth: new Date("2026-01-01T00:00:00.000Z") },
  ]));
  FamilyProfile.find.mockReturnValue(resolvedQuery([]));

  const vaccine = { _id: vaccineId, name: "Oral Polio Vaccine", code: "OPV", isActive: true };
  VaccineSchedule.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{
    _id: scheduleId,
    vaccineId: vaccine,
    minAgeDays: 30,
    guidelineVersion: "test-v1",
    doses: [{ doseNumber: 1, minIntervalDays: null }],
  }]) });

  DoseRecord.find.mockReturnValue(resolvedQuery(records));
  Appointment.findOne.mockReturnValue(resolvedQuery(activeAppointment));
  Appointment.find.mockReturnValue(resolvedQuery([]));
  CatchUpSchedule.findOneAndUpdate.mockResolvedValue({
    _id: catchUpId,
    status: catchUpStatus,
  });
  CatchUpSchedule.findOne.mockResolvedValue({ _id: catchUpId, status: catchUpStatus });
  Notification.updateOne.mockResolvedValue({ acknowledged: true, upsertedCount: 1 });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.APP_TIMEZONE = "Asia/Dhaka";
});

describe("T9.2 missed-dose detection unit tests", () => {
  test("creates one recovery record and notification for an overdue dose", async () => {
    configureBase();

    const result = await missedDoseJob.detectMissedDoses({ now: NOW });

    expect(result.profilesChecked).toBe(1);
    expect(result.dosesChecked).toBe(1);
    expect(result.missedRecordsEnsured).toBe(1);
    expect(result.errors).toBe(0);
    expect(CatchUpSchedule.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(CatchUpSchedule.findOneAndUpdate.mock.calls[0][2]).toEqual(
      expect.objectContaining({ upsert: true, new: true })
    );
    expect(Notification.updateOne).toHaveBeenCalledTimes(1);
    expect(Notification.updateOne.mock.calls[0][0]).toEqual({
      dedupeKey: `missed-dose:${catchUpId}`,
    });
    expect(Notification.updateOne.mock.calls[0][2]).toEqual(
      expect.objectContaining({ upsert: true })
    );
  });

  test("does not mark a dose missed when an active appointment exists", async () => {
    configureBase({ activeAppointment: { _id: "655555555555555555555555" } });

    const result = await missedDoseJob.detectMissedDoses({ now: NOW });

    expect(result.skippedActiveAppointment).toBe(1);
    expect(result.missedRecordsEnsured).toBe(0);
    expect(CatchUpSchedule.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Notification.updateOne).not.toHaveBeenCalled();
  });

  test("does not mark a dose missed when that dose is already completed", async () => {
    configureBase({ records: [{
      vaccineType: "OPV",
      doseNumber: 1,
      dateAdministered: new Date("2026-02-01T00:00:00.000Z"),
      appointmentId: null,
    }] });

    const result = await missedDoseJob.detectMissedDoses({ now: NOW });

    expect(result.skippedCompletedDose).toBe(1);
    expect(result.missedRecordsEnsured).toBe(0);
    expect(Appointment.findOne).not.toHaveBeenCalled();
    expect(CatchUpSchedule.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Notification.updateOne).not.toHaveBeenCalled();
  });

  test("does not create a missed record when the due date is today", async () => {
    User.find.mockReturnValue(resolvedQuery([{
      _id: citizenId,
      // Due date is 2026-10-20, which is the same local calendar date as NOW.
      dateOfBirth: new Date("2026-09-20T00:00:00.000Z"),
    }]));
    configureBase();
    User.find.mockReturnValue(resolvedQuery([{
      _id: citizenId,
      dateOfBirth: new Date("2026-09-20T00:00:00.000Z"),
    }]));

    const result = await missedDoseJob.detectMissedDoses({ now: NOW });

    expect(result.missedRecordsEnsured).toBe(0);
    expect(CatchUpSchedule.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("does not create a notification for a recovery record already closed", async () => {
    configureBase({ catchUpStatus: "Completed" });

    const result = await missedDoseJob.detectMissedDoses({ now: NOW });

    expect(result.missedRecordsEnsured).toBe(0);
    expect(CatchUpSchedule.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Notification.updateOne).not.toHaveBeenCalled();
  });

  test("repeated runs use the same unique recovery key and notification dedupe key", async () => {
    configureBase();

    await missedDoseJob.detectMissedDoses({ now: NOW });
    await missedDoseJob.detectMissedDoses({ now: NOW });

    expect(CatchUpSchedule.findOneAndUpdate).toHaveBeenCalledTimes(2);
    const firstRecoveryFilter = CatchUpSchedule.findOneAndUpdate.mock.calls[0][0];
    const secondRecoveryFilter = CatchUpSchedule.findOneAndUpdate.mock.calls[1][0];
    expect(secondRecoveryFilter).toEqual(firstRecoveryFilter);

    expect(Notification.updateOne).toHaveBeenCalledTimes(2);
    expect(Notification.updateOne.mock.calls[0][0]).toEqual(
      Notification.updateOne.mock.calls[1][0]
    );
    expect(Notification.updateOne.mock.calls[0][0].dedupeKey).toBe(
      `missed-dose:${catchUpId}`
    );
  });
});
