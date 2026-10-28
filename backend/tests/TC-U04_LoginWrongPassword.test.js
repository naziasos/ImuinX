/**
 * TC-U04 — Login with wrong password
 * Module: M1 Authentication & Profile
 * Expected: 401, generic message that does not reveal which field was wrong
 * Run: npx jest tests/TC-U04_
 */
process.env.JWT_SECRET = "test-jwt-secret";

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const OTP = require("../models/OTP");
const authRoutes = require("../routes/authRoutes");

jest.mock("../models/User");
jest.mock("../models/OTP");
jest.mock("../utils/email", () => ({ sendOTPEmail: jest.fn().mockResolvedValue(true) }));

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

const VALID = { name: "Test Citizen", email: "citizen@example.com", password: "Strong@123" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

test("TC-U04 Login with a wrong password returns 401 with a generic message", async () => {
  const hash = await bcrypt.hash(VALID.password, 10);
  User.findOne.mockResolvedValue({
    _id: "u1", email: VALID.email, password: hash, role: "citizen", emailVerified: true,
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: VALID.email, password: "WrongPassword@1" });

  expect(res.statusCode).toBe(401);
  expect(res.body.token).toBeUndefined();
  expect(res.body.message).toBe("Invalid email or password");
});