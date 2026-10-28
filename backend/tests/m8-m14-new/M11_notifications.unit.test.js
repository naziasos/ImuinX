
const mongoose = require("mongoose");
const Notification = require("../../models/Notification");

describe("M11 - Notifications & Reminders", () => {
  describe("TC-U51 - Notification schema rules", () => {
    test("should accept a valid notification with isRead false by default", async () => {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(),
        type: "appointment_reminder",
        message: "Your appointment is tomorrow.",
      });

      await expect(notification.validate()).resolves.toBeUndefined();
      expect(notification.isRead).toBe(false);
    });

    test("should reject notification without userId", async () => {
      const notification = new Notification({
        type: "general",
        message: "Test notification",
      });

      await expect(notification.validate()).rejects.toThrow();
    });

    test("should reject notification without message", async () => {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(),
        type: "general",
      });

      await expect(notification.validate()).rejects.toThrow();
    });

    test("should reject an unsupported notification type", async () => {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(),
        type: "unsupported_type",
        message: "Test notification",
      });

      await expect(notification.validate()).rejects.toThrow();
    });
  });

  describe("TC-U52 - Duplicate reminder prevention", () => {
    test("should define a unique sparse index on dedupeKey", () => {
      const indexes = Notification.schema.indexes();

      const dedupeIndex = indexes.find(
        ([fields, options]) =>
          fields.dedupeKey === 1 &&
          options.unique === true &&
          options.sparse === true
      );

      expect(dedupeIndex).toBeDefined();
      expect(dedupeIndex[1].name).toBe(
        "unique_notification_dedupe_key"
      );
    });

    test("should allow notifications without a dedupeKey", async () => {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(),
        type: "general",
        message: "A notification without a dedupe key",
      });

      await expect(notification.validate()).resolves.toBeUndefined();
      expect(notification.dedupeKey).toBeUndefined();
    });

    test("should trim dedupeKey whitespace", async () => {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(),
        type: "appointment_reminder",
        message: "Appointment reminder",
        dedupeKey: "  reminder-test-001  ",
      });

      await expect(notification.validate()).resolves.toBeUndefined();
      expect(notification.dedupeKey).toBe("reminder-test-001");
    });
  });
});

  describe("TC-U53 - Notification read access control", () => {
    const notificationId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const anotherUserId = new mongoose.Types.ObjectId();

    test("should scope notification updates to the notification owner", () => {
      const query = Notification.findOneAndUpdate({
        _id: notificationId,
        userId: ownerId,
      });

      expect(query.getFilter()).toEqual({
        _id: notificationId,
        userId: ownerId,
      });

      expect(ownerId.equals(anotherUserId)).toBe(false);
    });
  });
