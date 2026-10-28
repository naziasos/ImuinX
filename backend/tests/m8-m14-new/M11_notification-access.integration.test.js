
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

jest.mock("../../models/Notification", () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../../middleware/authMiddleware", () =>
  jest.fn((req, res, next) => {
    req.user = { _id: req.headers["x-test-user-id"] };
    next();
  })
);

const Notification = require("../../models/Notification");
const notificationRoutes = require("../../routes/notificationRoutes");

describe("M11 - TC-U53: Notification ownership access control", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/notifications", notificationRoutes);
  });

  test("should return 404 when notification does not belong to the logged-in user", async () => {
    const notificationId = new mongoose.Types.ObjectId().toString();
    const ownerId = new mongoose.Types.ObjectId().toString();
    const anotherUserId = new mongoose.Types.ObjectId().toString();

    Notification.findOneAndUpdate.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("x-test-user-id", anotherUserId);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Notification not found");

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: notificationId,
        userId: anotherUserId,
      },
      {
        $set: { isRead: true },
      },
      expect.objectContaining({
        runValidators: true,
      })
    );

    expect(ownerId).not.toBe(anotherUserId);
  });

  test("should return 200 when the notification belongs to the logged-in user", async () => {
    const notificationId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    Notification.findOneAndUpdate.mockResolvedValue({
      _id: notificationId,
      userId,
      isRead: true,
    });

    const response = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Notification marked as read");
    expect(response.body.notification.isRead).toBe(true);
  });

  test("should reject an invalid notification ID", async () => {
    const response = await request(app)
      .patch("/api/notifications/not-a-valid-id/read")
      .set("x-test-user-id", new mongoose.Types.ObjectId().toString());

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid notification ID");
    expect(Notification.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
