const mongoose = require("mongoose");
const Notification = require("../../models/Notification");

describe("M11 - Additional Notification Unit Tests", () => {
  const validNotification = () => ({
    userId: new mongoose.Types.ObjectId(),
    type: "appointment_reminder",
    message: "Appointment reminder",
  });

  test("TC-U51A: Reject blank notification message", async () => {
    const notification = new Notification({
      ...validNotification(),
      message: "   ",
    });

    await expect(notification.validate()).rejects.toThrow();
  });

  test("TC-U51B: Accept notification with optional null referenceId", async () => {
    const notification = new Notification({
      ...validNotification(),
      referenceId: null,
    });

    await expect(
      notification.validate()
    ).resolves.toBeUndefined();
  });

  test("TC-U51C: Trim message and dedupeKey", async () => {
    const notification = new Notification({
      ...validNotification(),
      message: "  Appointment reminder  ",
      dedupeKey: "  appointment:123  ",
    });

    await notification.validate();

    expect(notification.message).toBe("Appointment reminder");
    expect(notification.dedupeKey).toBe("appointment:123");
  });

  test("TC-U52A: Unique dedupeKey index exists", () => {
    const indexes = Notification.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { dedupeKey: 1 },
          expect.objectContaining({
            unique: true,
            sparse: true,
          }),
        ],
      ])
    );
  });
});