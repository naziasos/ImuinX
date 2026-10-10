
const request = require("supertest");
const express = require("express");

const User = require("../models/User");
const authRoutes = require("../routes/authRoutes");

jest.mock("../models/User");

jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    req.user = {
      _id: "test-user-id",
      id: "test-user-id",
      role: "citizen",
    };
    next();
  };
});

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

describe("User Profile API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/auth/profile returns the logged-in user's profile", async () => {
    const profile = {
      name: "Test Guardian",
      email: "guardian@example.com",
      phoneNumber: "01700000000",
      address: { city: "Dhaka" },
      dateOfBirth: new Date("1990-05-10"),
      updatedAt: new Date(),
    };

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(profile),
    });

    const response = await request(app)
      .get("/api/auth/profile");

    expect(response.statusCode).toBe(200);
    expect(response.body.profile.name).toBe("Test Guardian");
    expect(response.body.profile.phoneNumber).toBe("01700000000");

    expect(User.findById).toHaveBeenCalledWith("test-user-id");
  });

  test("PATCH /api/auth/profile updates the logged-in user's profile", async () => {
    const user = {
      _id: "test-user-id",
      name: "Test Guardian",
      phoneNumber: null,
      address: null,
      dateOfBirth: null,
      save: jest.fn().mockResolvedValue(true),
    };

    const updatedProfile = {
      name: "Updated Guardian",
      phoneNumber: "01700000000",
      address: { city: "Dhaka" },
      updatedAt: new Date(),
    };

    User.findById
      .mockResolvedValueOnce(user)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(updatedProfile),
      });

    const response = await request(app)
      .patch("/api/auth/profile")
      .send({
        name: "Updated Guardian",
        phoneNumber: "01700000000",
        address: { city: "Dhaka" },
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Profile updated successfully");
    expect(user.name).toBe("Updated Guardian");
    expect(user.phoneNumber).toBe("01700000000");
    expect(user.address.city).toBe("Dhaka");
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test("PATCH /api/auth/profile rejects protected fields", async () => {
    const response = await request(app)
      .patch("/api/auth/profile")
      .send({
        role: "admin",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid field(s) provided");
    expect(User.findById).not.toHaveBeenCalled();
  });

  test("PATCH /api/auth/profile rejects an invalid date of birth", async () => {
    const user = {
      _id: "test-user-id",
      name: "Test Guardian",
      save: jest.fn(),
    };

    User.findById.mockResolvedValue(user);

    const response = await request(app)
      .patch("/api/auth/profile")
      .send({
        dateOfBirth: "2035-01-01",
      });

    expect(response.statusCode).toBe(400);
    expect(user.save).not.toHaveBeenCalled();
  });
});