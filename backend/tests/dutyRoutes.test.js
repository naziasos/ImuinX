
const request = require("supertest");
const express = require("express");

const User = require("../models/User");
const DutyAssignment = require("../models/DutyAssignment");
const clinicRoutes = require("../routes/clinicRoutes");

jest.mock("../models/User");
jest.mock("../models/DutyAssignment");

// Mock authentication middleware
jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    req.user = {
      id: "clinic-admin-id",
      role: "clinicAdmin",
    };

    next();
  };
});

const app = express();

app.use(express.json());
app.use("/api/clinics", clinicRoutes);

describe("Duty Assignment Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/clinics/my-clinic/duties should create a duty assignment", async () => {
    User.findById.mockResolvedValue({
      _id: "clinic-admin-id",
      role: "clinicAdmin",
      clinicId: "clinic-123",
    });

    User.findOne.mockResolvedValue({
      _id: "worker-123",
      name: "Test Worker",
      role: "worker",
      clinicId: "clinic-123",
    });

    const dutyAssignment = {
      _id: "duty-123",
      workerId: "worker-123",
      clinicId: "clinic-123",
      dutyDate: "2026-09-28",
      dutyType: "Vaccination",
    };

    DutyAssignment.create.mockResolvedValue(dutyAssignment);

    const response = await request(app)
      .post("/api/clinics/my-clinic/duties")
      .send({
        workerId: "worker-123",
        dutyDate: "2026-09-28",
        dutyType: "Vaccination",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.message).toBe(
      "Duty assigned successfully"
    );

    expect(response.body.dutyAssignment).toEqual(
      dutyAssignment
    );

    expect(DutyAssignment.create).toHaveBeenCalledWith({
      workerId: "worker-123",
      clinicId: "clinic-123",
      dutyDate: "2026-09-28",
      dutyType: "Vaccination",
    });
  });
});

