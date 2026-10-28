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

  test("POST /api/clinics/my-clinic/duties should reject invalid duty type", async () => {
    const response = await request(app)
      .post("/api/clinics/my-clinic/duties")
      .send({
        workerId: "worker-123",
        dutyDate: "2026-09-28",
        dutyType: "Registration Desk",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Invalid duty type. Only Vaccination and In-House Visit are allowed"
    );

    expect(DutyAssignment.create).not.toHaveBeenCalled();
  });

  describe("PATCH /api/clinics/my-clinic/duties/:dutyId/reassign", () => {
    const dutyId = "64b000000000000000000001";
    const oldWorkerId = "64b0000000000000000000a1";
    const newWorkerId = "64b0000000000000000000a2";

    const oldDuty = {
      _id: dutyId,
      workerId: oldWorkerId,
      clinicId: "clinic-123",
      dutyDate: new Date("2026-09-28T00:00:00.000Z"),
      dutyType: "Vaccination",
    };

    beforeEach(() => {
      User.findById.mockResolvedValue({
        _id: "clinic-admin-id",
        role: "clinicAdmin",
        clinicId: "clinic-123",
      });
    });

    test("moves the duty to another worker and deletes the old one", async () => {
      DutyAssignment.findOne
        .mockResolvedValueOnce(oldDuty) // the duty being replaced
        .mockResolvedValueOnce(null); // replacement is free that day

      User.findOne.mockResolvedValue({
        _id: newWorkerId,
        name: "Replacement",
        role: "worker",
        clinicId: "clinic-123",
      });

      DutyAssignment.create.mockResolvedValue({
        _id: "duty-new",
        workerId: newWorkerId,
        dutyType: "Vaccination",
      });
      DutyAssignment.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app)
        .patch(`/api/clinics/my-clinic/duties/${dutyId}/reassign`)
        .send({ newWorkerId });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("Duty reassigned successfully");
      expect(DutyAssignment.create).toHaveBeenCalledWith({
        workerId: newWorkerId,
        clinicId: "clinic-123",
        dutyDate: oldDuty.dutyDate,
        dutyType: "Vaccination",
      });
      expect(DutyAssignment.deleteOne).toHaveBeenCalledWith({ _id: dutyId });
    });

    test("rejects a replacement who already has a duty that day", async () => {
      DutyAssignment.findOne
        .mockResolvedValueOnce(oldDuty)
        .mockResolvedValueOnce({ _id: "busy" });

      User.findOne.mockResolvedValue({
        _id: newWorkerId,
        name: "Busy Worker",
        role: "worker",
        clinicId: "clinic-123",
      });

      const response = await request(app)
        .patch(`/api/clinics/my-clinic/duties/${dutyId}/reassign`)
        .send({ newWorkerId });

      expect(response.statusCode).toBe(409);
      expect(DutyAssignment.create).not.toHaveBeenCalled();
      expect(DutyAssignment.deleteOne).not.toHaveBeenCalled();
    });

    test("rejects reassigning to the same worker", async () => {
      DutyAssignment.findOne.mockResolvedValueOnce(oldDuty);

      const response = await request(app)
        .patch(`/api/clinics/my-clinic/duties/${dutyId}/reassign`)
        .send({ newWorkerId: oldWorkerId });

      expect(response.statusCode).toBe(400);
      expect(DutyAssignment.create).not.toHaveBeenCalled();
    });

    test("rejects a worker from another clinic", async () => {
      DutyAssignment.findOne.mockResolvedValueOnce(oldDuty);
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .patch(`/api/clinics/my-clinic/duties/${dutyId}/reassign`)
        .send({ newWorkerId });

      expect(response.statusCode).toBe(404);
      expect(DutyAssignment.create).not.toHaveBeenCalled();
    });
  });
});