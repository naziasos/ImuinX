/**
 * TC-U07 — Clinic admin adds worker to own clinic
 * Module: M2 Clinic & Staff Onboarding
 * Expected: worker linked to that clinic only; duplicate email rejected
 * Run: npx jest tests/TC-U07_
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

test("TC-U07 Clinic admin adds a worker linked to their own clinic; duplicate email is rejected", async () => {
  User.findById.mockResolvedValue({ _id: "user-1", role: "clinicAdmin", clinicId: "clinic-A" });
  User.findOne.mockResolvedValue(null);
  User.create.mockImplementation(async (data) => ({ _id: "w-1", ...data }));

  const ok = await request(app)
    .post("/api/clinics/my-clinic/workers")
    .set("x-test-role", "clinicAdmin")
    .send({ name: "Worker One", email: "Worker1@Example.com" });

  expect(ok.statusCode).toBe(201);
  expect(ok.body.worker.role).toBe("worker");
  expect(ok.body.worker.clinicId).toBe("clinic-A"); // scoped to the admin's clinic only
  expect(User.create.mock.calls[0][0].email).toBe("worker1@example.com");
  expect(sendWorkerCredentials).toHaveBeenCalledTimes(1);

  // Same email again -> rejected
  User.findOne.mockResolvedValue({ _id: "w-1" });
  User.create.mockClear();

  const dup = await request(app)
    .post("/api/clinics/my-clinic/workers")
    .set("x-test-role", "clinicAdmin")
    .send({ name: "Worker One", email: "worker1@example.com" });

  expect(dup.statusCode).toBe(409);
  expect(User.create).not.toHaveBeenCalled();
});