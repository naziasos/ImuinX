
const request = require("supertest");
const express = require("express");

const User = require("../models/User");
const Clinic = require("../models/Clinic");
const clinicRoutes = require("../routes/clinicRoutes");
const inHouseRoutes = require("../routes/inHouseRoutes");

jest.mock("../models/User");
jest.mock("../models/Clinic");

jest.mock("../utils/email", () => ({
  sendClinicAdminCredentials: jest.fn().mockResolvedValue(true),
  sendWorkerCredentials: jest.fn().mockResolvedValue(true),
}));

// Test-এর সময় role header দিয়ে নির্ধারণ করা হবে।
jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    req.user = {
      id: "test-user-id",
      role: req.headers["x-test-role"] || "admin",
    };
    next();
  };
});

const app = express();
app.use(express.json());
app.use("/api/clinics", clinicRoutes);
app.use("/api/in-house-requests", inHouseRoutes);

const sendAs = (role) => ({
  "x-test-role": role,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("M2 - Clinic & Staff Onboarding", () => {
  // TC-U08: Clinic create + duplicate clinic-admin email reject
  test("TC-U08: creates a clinic and rejects a duplicate admin email", async () => {
    const clinicAdmin = {
      _id: "admin-user-1",
      name: "Test Clinic Admin",
      email: "clinicadmin@example.com",
      role: "clinicAdmin",
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(clinicAdmin);

    User.create.mockResolvedValue(clinicAdmin);

    Clinic.create.mockResolvedValue({
      _id: "clinic-123",
      name: "M2 Test Clinic",
      location: "Dhaka",
      contact: "01700000000",
      latitude: null,
      longitude: null,
      status: "Active",
    });

    const firstResponse = await request(app)
      .post("/api/clinics")
      .set(sendAs("admin"))
      .send({
        clinicName: "M2 Test Clinic",
        location: "Dhaka",
        contact: "01700000000",
        adminName: "Test Clinic Admin",
        adminEmail: "clinicadmin@example.com",
      });

    expect(firstResponse.statusCode).toBe(201);
    expect(firstResponse.body.clinic.name).toBe("M2 Test Clinic");
    expect(firstResponse.body.clinic.clinicAdmin.role).toBe("clinicAdmin");
    expect(Clinic.create).toHaveBeenCalledTimes(1);

    const secondResponse = await request(app)
      .post("/api/clinics")
      .set(sendAs("admin"))
      .send({
        clinicName: "Another Test Clinic",
        location: "Dhaka",
        contact: "01800000000",
        adminName: "Another Admin",
        adminEmail: "clinicadmin@example.com",
      });

    expect(secondResponse.statusCode).toBe(409);
    expect(Clinic.create).toHaveBeenCalledTimes(1);
  });

  // TC-U10: Admin-only and worker-only endpoint access
  test("TC-U10: blocks users with unauthorized roles", async () => {
    const citizenResponse = await request(app)
      .get("/api/clinics/test")
      .set(sendAs("citizen"));

    expect(citizenResponse.statusCode).toBe(403);
    expect(citizenResponse.body.message).toBe("Admin access required");

    const adminResponse = await request(app)
      .get("/api/clinics/test")
      .set(sendAs("admin"));

    expect(adminResponse.statusCode).toBe(200);

    for (const role of ["citizen", "clinicAdmin"]) {
      const response = await request(app)
        .get("/api/in-house-requests/pending")
        .set(sendAs(role));

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(
        "Access denied. Health worker only."
      );
    }
  });

  // TC-U11: Worker creation + clinic scope + duplicate worker email
  test("TC-U11: creates a worker for the admin's clinic and rejects duplicate email", async () => {
    const clinicAdmin = {
      _id: "clinic-admin-1",
      role: "clinicAdmin",
      clinicId: "clinic-123",
    };

    const worker = {
      _id: "worker-1",
      name: "Test Health Worker",
      email: "worker@example.com",
      role: "worker",
      clinicId: "clinic-123",
    };

    User.findById.mockResolvedValue(clinicAdmin);
    User.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(worker);

    User.create.mockResolvedValue(worker);

    const firstResponse = await request(app)
      .post("/api/clinics/my-clinic/workers")
      .set(sendAs("clinicAdmin"))
      .send({
        name: "Test Health Worker",
        email: "worker@example.com",
      });

    expect(firstResponse.statusCode).toBe(201);
    expect(firstResponse.body.worker.role).toBe("worker");
    expect(firstResponse.body.worker.clinicId).toBe("clinic-123");

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Health Worker",
        email: "worker@example.com",
        role: "worker",
        clinicId: "clinic-123",
      })
    );

    const secondResponse = await request(app)
      .post("/api/clinics/my-clinic/workers")
      .set(sendAs("clinicAdmin"))
      .send({
        name: "Another Worker",
        email: "worker@example.com",
      });

    expect(secondResponse.statusCode).toBe(409);
    expect(User.create).toHaveBeenCalledTimes(1);
  });
});
