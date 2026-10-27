
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");

describe("TC-U17: Appointment Schema", () => {
  const validAppointment = () => ({
    citizenId: new mongoose.Types.ObjectId(),
    clinicId: new mongoose.Types.ObjectId(),
    vaccineId: new mongoose.Types.ObjectId(),
    doseNumber: 1,
    dateTime: new Date("2027-10-01T10:00:00+06:00"),
  });

  test("accepts valid appointment with required fields", () => {
    const appointment = new Appointment(validAppointment());

    expect(appointment.validateSync()).toBeUndefined();
  });

  test("rejects missing required fields", () => {
    const appointment = new Appointment({});
    const error = appointment.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.citizenId).toBeDefined();
    expect(error.errors.clinicId).toBeDefined();
    expect(error.errors.vaccineId).toBeDefined();
    expect(error.errors.doseNumber).toBeDefined();
    expect(error.errors.dateTime).toBeDefined();
  });

  test("uses the actual default status Confirmed", () => {
    const appointment = new Appointment(validAppointment());

    expect(appointment.status).toBe("Confirmed");
  });

  test("rejects invalid status and dose number", () => {
    const invalidStatus = new Appointment({
      ...validAppointment(),
      status: "InvalidStatus",
    });

    const invalidDose = new Appointment({
      ...validAppointment(),
      doseNumber: 0,
    });

    expect(invalidStatus.validateSync().errors.status).toBeDefined();
    expect(invalidDose.validateSync().errors.doseNumber).toBeDefined();
  });

  test("accepts all supported appointment statuses", () => {
    for (const status of [
      "Pending",
      "Confirmed",
      "Completed",
      "Cancelled",
    ]) {
      const appointment = new Appointment({
        ...validAppointment(),
        status,
      });

      expect(appointment.validateSync()).toBeUndefined();
    }
  });
});
