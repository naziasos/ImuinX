const mongoose = require("mongoose");
const Notification = require("../models/Notification");

describe("Notification Schema Tests", () => {
  const validUserId = new mongoose.Types.ObjectId();

  test("should create a valid notification", () => {
    const notification = new Notification({
      userId: validUserId,
      type: "appointment",
      message: "Your appointment has been confirmed",
    });

    const error = notification.validateSync();

    expect(error).toBeUndefined();
    expect(notification.userId.toString()).toBe(
      validUserId.toString()
    );
  });

  test("should set isRead to false by default", () => {
    const notification = new Notification({
      userId: validUserId,
      type: "dose",
      message: "Your next vaccine dose is due",
    });

    expect(notification.isRead).toBe(false);
  });

  test("should require userId", () => {
    const notification = new Notification({
      type: "general",
      message: "Welcome to ImuinX",
    });

    const error = notification.validateSync();

    expect(error.errors.userId).toBeDefined();
  });

  test("should require message", () => {
    const notification = new Notification({
      userId: validUserId,
      type: "general",
    });

    const error = notification.validateSync();

    expect(error.errors.message).toBeDefined();
  });

  test("should reject an invalid notification type", () => {
    const notification = new Notification({
      userId: validUserId,
      type: "invalid-type",
      message: "Test notification",
    });

    const error = notification.validateSync();

    expect(error.errors.type).toBeDefined();
  });

  test("should have createdAt and updatedAt timestamps", () => {
    const notification = new Notification({
      userId: validUserId,
      type: "certificate",
      message: "Your certificate is ready",
    });

    expect(notification.schema.options.timestamps).toBe(true);
  });
});
