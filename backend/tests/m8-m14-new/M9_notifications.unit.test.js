
const mongoose = require("mongoose");
const Notification = require("../../models/Notification");

describe("M9 - Notification Model Unit Tests", () => {
  test("should create a valid notification", async () => {
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(),
      type: "general",
      message: "Test notification",
    });

    await expect(notification.validate()).resolves.toBeUndefined();
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

  test("should set isRead to false by default", () => {
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(),
      type: "general",
      message: "Test notification",
    });

    expect(notification.isRead).toBe(false);
  });
});
