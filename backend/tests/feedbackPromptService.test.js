jest.mock("../models/Feedback", () => ({
  exists: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock("../models/Appointment", () => ({ countDocuments: jest.fn() }));
jest.mock("../models/InHouseRequest", () => ({ countDocuments: jest.fn() }));

const Feedback = require("../models/Feedback");
const Appointment = require("../models/Appointment");
const InHouseRequest = require("../models/InHouseRequest");
const service = require("../services/feedbackPromptService");

// findOne(...).sort(...).select(...) chain
const lastSubmitted = (submittedAt) => ({
  sort: () => ({
    select: () => Promise.resolve(submittedAt ? { submittedAt } : null),
  }),
});

const USER = "user1";

beforeEach(() => {
  jest.resetAllMocks();
  Feedback.exists.mockResolvedValue(null);
});

describe("isEligibleForNewPrompt", () => {
  test("first ever feedback is allowed immediately", async () => {
    Feedback.findOne.mockReturnValue(lastSubmitted(null));
    expect(await service.isEligibleForNewPrompt(USER)).toBe(true);
  });

  test("blocked while a booking prompt is still pending", async () => {
    Feedback.exists.mockResolvedValue({ _id: "x" });
    expect(await service.isEligibleForNewPrompt(USER)).toBe(false);
  });

  test("blocked after 1 appointment and 0 in-house requests", async () => {
    Feedback.findOne.mockReturnValue(lastSubmitted(new Date()));
    Appointment.countDocuments.mockResolvedValue(1);
    InHouseRequest.countDocuments.mockResolvedValue(0);
    expect(await service.isEligibleForNewPrompt(USER)).toBe(false);
  });

  test("allowed after 2 appointments", async () => {
    Feedback.findOne.mockReturnValue(lastSubmitted(new Date()));
    Appointment.countDocuments.mockResolvedValue(2);
    InHouseRequest.countDocuments.mockResolvedValue(0);
    expect(await service.isEligibleForNewPrompt(USER)).toBe(true);
  });

  test("allowed after 1 in-house request", async () => {
    Feedback.findOne.mockReturnValue(lastSubmitted(new Date()));
    Appointment.countDocuments.mockResolvedValue(0);
    InHouseRequest.countDocuments.mockResolvedValue(1);
    expect(await service.isEligibleForNewPrompt(USER)).toBe(true);
  });

  test("only counts activity after the last submitted feedback", async () => {
    const since = new Date("2026-01-01");
    Feedback.findOne.mockReturnValue(lastSubmitted(since));
    Appointment.countDocuments.mockResolvedValue(0);
    InHouseRequest.countDocuments.mockResolvedValue(0);

    await service.isEligibleForNewPrompt(USER);

    expect(Appointment.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: { $gt: since } })
    );
    expect(InHouseRequest.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: { $gt: since } })
    );
  });
});

describe("promptAfterAppointment", () => {
  const appointment = { _id: "a1", citizenId: USER, clinicId: "c1", familyProfileId: null };

  test("creates a Pending Appointment feedback when eligible", async () => {
    Feedback.findOne
      .mockResolvedValueOnce(null) // existing prompt for this appointment
      .mockReturnValueOnce(lastSubmitted(null)); // last submitted
    Feedback.findOneAndUpdate.mockResolvedValue({ _id: "f1", feedbackType: "Appointment" });

    const result = await service.promptAfterAppointment(appointment, "COVID-19");

    expect(result._id).toBe("f1");
    const [filter, update] = Feedback.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ feedbackType: "Appointment", appointmentId: "a1" });
    expect(update.$setOnInsert).toMatchObject({
      userId: USER,
      clinicId: "c1",
      citizenId: USER,
      citizenType: "User",
      vaccineType: "COVID-19",
      promptStatus: "Pending",
    });
  });

  test("uses the family profile when booked for a family member", async () => {
    Feedback.findOne
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(lastSubmitted(null));
    Feedback.findOneAndUpdate.mockResolvedValue({ _id: "f1" });

    await service.promptAfterAppointment({ ...appointment, familyProfileId: "fp1" }, "MMR");

    const update = Feedback.findOneAndUpdate.mock.calls[0][1];
    expect(update.$setOnInsert).toMatchObject({ citizenId: "fp1", citizenType: "FamilyProfile" });
  });

  test("returns null (no prompt) during the cooldown", async () => {
    Feedback.findOne
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(lastSubmitted(new Date()));
    Appointment.countDocuments.mockResolvedValue(1);
    InHouseRequest.countDocuments.mockResolvedValue(0);

    expect(await service.promptAfterAppointment(appointment, "MMR")).toBeNull();
    expect(Feedback.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("never throws", async () => {
    Feedback.findOne.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await service.promptAfterAppointment(appointment, "MMR")).toBeNull();
  });
});

describe("promptAfterInHouseRequest", () => {
  const request = { _id: "r1", citizen: USER, familyMember: null, vaccineOrReason: "Flu shot" };

  test("creates a Pending InHouse feedback without a clinic", async () => {
    Feedback.findOne
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(lastSubmitted(null));
    Feedback.findOneAndUpdate.mockResolvedValue({ _id: "f2", feedbackType: "InHouse" });

    await service.promptAfterInHouseRequest(request);

    const [filter, update] = Feedback.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ feedbackType: "InHouse", inHouseRequestId: "r1" });
    expect(update.$setOnInsert).toMatchObject({
      clinicId: null,
      vaccineType: "Flu shot",
      citizenType: "User",
    });
  });
});

describe("attachClinicToInHouseFeedback", () => {
  test("sets clinicId once, overwriting the immutable field", async () => {
    await service.attachClinicToInHouseFeedback("r1", "c9");
    expect(Feedback.updateOne).toHaveBeenCalledWith(
      { feedbackType: "InHouse", inHouseRequestId: "r1", clinicId: null },
      { $set: { clinicId: "c9" } },
      { overwriteImmutable: true }
    );
  });

  test("does nothing without a clinic", async () => {
    await service.attachClinicToInHouseFeedback("r1", null);
    expect(Feedback.updateOne).not.toHaveBeenCalled();
  });
});
