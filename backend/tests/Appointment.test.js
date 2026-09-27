const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");

describe("Appointment Schema", () => {
  test("should create a valid appointment", () => {
    const appointment = new Appointment({
      citizenId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      dateTime: new Date("2026-10-01T10:00:00"),
      status: "Pending",
    });

    const error = appointment.validateSync();

    expect(error).toBeUndefined();
  });

  test("should default status to Pending", () => {
    const appointment = new Appointment({
      citizenId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      dateTime: new Date("2026-10-01T10:00:00"),
    });

    const error = appointment.validateSync();

    expect(error).toBeUndefined();
    expect(appointment.status).toBe("Pending");
  });

  test("should require citizenId, clinicId and dateTime", () => {
    const appointment = new Appointment({});

    const error = appointment.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.citizenId).toBeDefined();
    expect(error.errors.clinicId).toBeDefined();
    expect(error.errors.dateTime).toBeDefined();
  });

  test("should reject invalid appointment status", () => {
    const appointment = new Appointment({
      citizenId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      dateTime: new Date("2026-10-01T10:00:00"),
      status: "InvalidStatus",
    });

    const error = appointment.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });

  test("should accept all valid appointment statuses", () => {
    const statuses = [
      "Pending",
      "Confirmed",
      "Completed",
      "Cancelled",
    ];

    statuses.forEach((status) => {
      const appointment = new Appointment({
        citizenId: new mongoose.Types.ObjectId(),
        clinicId: new mongoose.Types.ObjectId(),
        dateTime: new Date("2026-10-01T10:00:00"),
        status,
      });

      const error = appointment.validateSync();

      expect(error).toBeUndefined();
    });
  });

  test("should have timestamp fields in the schema", () => {
  expect(Appointment.schema.path("createdAt")).toBeDefined();
  expect(Appointment.schema.path("updatedAt")).toBeDefined();
});
});