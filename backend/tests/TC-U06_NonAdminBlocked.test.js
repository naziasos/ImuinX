/**
 * TC-U06 — Non-admin blocked from admin API
 * Module: M2 Clinic & Staff Onboarding
 * Expected: 403 \"Admin access required\"
 * Run: npx jest tests/TC-U06_
 */
const request = require("supertest");
const express = require("express");

const User = require("../models/User");
const Clinic = require("../models/Clinic");
const clinicRoutes = require("../routes/clinicRoutes");
const { sendClinicAdminCredentials, sendWorkerCredentials } = require("../utils/email");

jest.mock("../models/User");
jest.mock("../models/Clinic");
jest.mock("../utils/email", () => ({
  sendClinicAdminCredentials: jest.fn().mockResolvedValue(true),
  sendWorkerCredentials: jest.fn().mockResolvedValue(true),
}));
// Role is chosen per request with the "x-test-role" header. adminMiddleware is NOT mocked.
jest.mock("../middleware/authMiddleware", () => (req, res, next) => {
  req.user = { id: "user-1", _id: "user-1", role: req.headers["x-test-role"] || "citizen" };
  next();
});

const app = express();
app.use(express.json());
app.use("/api/clinics", clinicRoutes);

const CLINIC_BODY = {
  clinicName: "Green Life Clinic",
  location: "Dhanmondi, Dhaka",
  contact: "01700000000",
  adminName: "Clinic Admin",
  adminEmail: "Admin@Greenlife.com",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

test("TC-U06 A non-admin cannot call the admin-only create-clinic API", async () => {
  const res = await request(app).post("/api/clinics").set("x-test-role", "citizen").send(CLINIC_BODY);

  expect(res.statusCode).toBe(403);
  expect(res.body.message).toBe("Admin access required");
  expect(Clinic.create).not.toHaveBeenCalled();
  expect(User.create).not.toHaveBeenCalled();
});