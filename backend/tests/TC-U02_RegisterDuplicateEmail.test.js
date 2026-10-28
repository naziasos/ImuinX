/**
 * TC-U02 — Register with duplicate email
 * Module: M1 Authentication & Profile
 * Expected: request rejected, no second user created
 * Run: npx jest tests/TC-U02_
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

test("TC-U02 Register with a duplicate email is rejected", async () => {
  User.findOne.mockResolvedValue({ _id: "existing", email: VALID.email });

  const res = await request(app).post("/api/auth/register").send(VALID);

  expect(res.statusCode).toBe(409);
  expect(res.body.message).toMatch(/already registered/i);
  expect(User.create).not.toHaveBeenCalled();
});