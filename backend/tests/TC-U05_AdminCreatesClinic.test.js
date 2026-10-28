/**
 * TC-U05 — Admin creates a clinic
 * Module: M2 Clinic & Staff Onboarding
 * Expected: clinic and clinic-admin account created, credentials e-mailed
 * Run: npx jest tests/TC-U05_
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

test("TC-U05 Admin creates a clinic together with its clinic admin", async () => {
  const adminUser = { _id: "ca-1", name: "Clinic Admin", email: "admin@greenlife.com", role: "clinicAdmin", save: jest.fn() };
  User.findOne.mockResolvedValue(null);
  User.create.mockResolvedValue(adminUser);
  Clinic.create.mockResolvedValue({ _id: "c-1", name: CLINIC_BODY.clinicName, location: CLINIC_BODY.location, contact: CLINIC_BODY.contact, status: "Active" });

  const res = await request(app).post("/api/clinics").set("x-test-role", "admin").send(CLINIC_BODY);

  expect(res.statusCode).toBe(201);
  expect(res.body.clinic.id).toBe("c-1");
  expect(res.body.clinic.clinicAdmin.role).toBe("clinicAdmin");

  const userData = User.create.mock.calls[0][0];
  expect(userData.role).toBe("clinicAdmin");
  expect(userData.email).toBe("admin@greenlife.com"); // trimmed + lower-cased
  expect(userData.password).toMatch(/^\$2[aby]\$/);   // bcrypt hash, not the temp password

  expect(adminUser.clinicId).toBe("c-1");             // admin linked to the clinic
  expect(sendClinicAdminCredentials).toHaveBeenCalledTimes(1);
});