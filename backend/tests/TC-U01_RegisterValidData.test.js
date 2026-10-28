/**
 * TC-U01 — Register with valid data
 * Module: M1 Authentication & Profile
 * Expected: user created, password hashed, role = citizen
 * Run: npx jest tests/TC-U01_
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

test("TC-U01 Register with valid data creates a citizen with a hashed password", async () => {
  User.findOne.mockResolvedValue(null);
  User.create.mockImplementation(async (data) => ({ _id: "u1", ...data }));
  OTP.create.mockResolvedValue({});

  const res = await request(app).post("/api/auth/register").send(VALID);

  expect(res.statusCode).toBe(201);
  expect(res.body.user.role).toBe("citizen");

  const saved = User.create.mock.calls[0][0];
  expect(saved.password).not.toBe(VALID.password); // never stored as plain text
  expect(await bcrypt.compare(VALID.password, saved.password)).toBe(true);
  expect(saved.emailVerified).toBe(false);
});