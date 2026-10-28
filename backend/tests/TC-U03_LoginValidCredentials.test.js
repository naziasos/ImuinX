/**
 * TC-U03 — Login with valid credentials
 * Module: M1 Authentication & Profile
 * Expected: 200, token returned that carries the user's role
 * Run: npx jest tests/TC-U03_
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

test("TC-U03 Login with valid credentials returns a token carrying the role", async () => {
  const hash = await bcrypt.hash(VALID.password, 10);
  User.findOne.mockResolvedValue({
    _id: "u1", name: VALID.name, email: VALID.email,
    password: hash, role: "citizen", emailVerified: true,
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: VALID.email, password: VALID.password });

  expect(res.statusCode).toBe(200);
  expect(res.body.token).toBeDefined();

  const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
  expect(decoded.role).toBe("citizen");
  expect(decoded.id).toBe("u1");
});