
const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.mock("../models/User");
jest.mock("../models/OTP");

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

jest.mock("../utils/email", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
}));

const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOTPEmail } = require("../utils/email");

process.env.JWT_SECRET = "test-jwt-secret";

const authRoutes = require("../routes/authRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

describe("M1 - Authentication Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-U01: Valid registration hashes password and assigns citizen role", async () => {
    User.findOne.mockResolvedValue(null);

    User.create.mockImplementation(async (data) => ({
      _id: "new-user-id",
      ...data,
    }));

    OTP.create.mockResolvedValue({});

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Citizen",
        email: "newcitizen@example.com",
        password: "StrongPass123!",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.user.role).toBe("citizen");
    expect(response.body.user.emailVerified).toBe(false);

    const savedUser = User.create.mock.calls[0][0];

    expect(savedUser.password).not.toBe("StrongPass123!");

    expect(
      await bcrypt.compare(
        "StrongPass123!",
        savedUser.password
      )
    ).toBe(true);

    expect(OTP.create).toHaveBeenCalled();
    expect(sendOTPEmail).toHaveBeenCalled();
  });

  test("TC-U02: Duplicate email registration is rejected", async () => {
    User.findOne.mockResolvedValue({
      email: "existing@example.com",
    });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Another Citizen",
        email: "existing@example.com",
        password: "StrongPass123!",
      });

    expect(response.statusCode).toBe(409);

    expect(response.body.message).toBe(
      "Email is already registered"
    );

    expect(User.create).not.toHaveBeenCalled();
  });

  test("TC-U03: Weak password registration is rejected", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Weak Password User",
        email: "weak@example.com",
        password: "123",
      });

    expect(response.statusCode).toBe(400);

    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  test("TC-U04: Valid login returns a JWT containing the user's role", async () => {
    const hashedPassword = await bcrypt.hash(
      "StrongPass123!",
      10
    );

    User.findOne.mockResolvedValue({
      _id: "test-user-id",
      name: "Test Citizen",
      email: "citizen@example.com",
      password: hashedPassword,
      role: "citizen",
      clinicId: null,
      emailVerified: true,
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "citizen@example.com",
        password: "StrongPass123!",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();

    const decoded = jwt.verify(
      response.body.token,
      process.env.JWT_SECRET
    );

    expect(decoded.role).toBe("citizen");
    expect(response.body.user.role).toBe("citizen");
  });

  test("TC-U05: Login with wrong password is rejected", async () => {
    const hashedPassword = await bcrypt.hash(
      "CorrectPass123!",
      10
    );

    User.findOne.mockResolvedValue({
      _id: "test-user-id",
      email: "citizen@example.com",
      password: hashedPassword,
      role: "citizen",
      emailVerified: true,
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "citizen@example.com",
        password: "WrongPass123!",
      });

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe(
      "Invalid email or password"
    );
  });
});
