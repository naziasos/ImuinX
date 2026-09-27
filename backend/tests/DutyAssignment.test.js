const mongoose = require("mongoose");
const DutyAssignment = require("../models/DutyAssignment");

describe("DutyAssignment Model", () => {
  test("should create a valid duty assignment", () => {
    const assignment = new DutyAssignment({
      workerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      dutyDate: new Date(),
      dutyType: "Vaccination",
    });

    const error = assignment.validateSync();

    expect(error).toBeUndefined();
  });

  test("should require workerId", () => {
    const assignment = new DutyAssignment({
      clinicId: new mongoose.Types.ObjectId(),
      dutyDate: new Date(),
      dutyType: "Vaccination",
    });

    const error = assignment.validateSync();

    expect(error.errors.workerId).toBeDefined();
  });

  test("should require clinicId", () => {
    const assignment = new DutyAssignment({
      workerId: new mongoose.Types.ObjectId(),
      dutyDate: new Date(),
      dutyType: "Vaccination",
    });

    const error = assignment.validateSync();

    expect(error.errors.clinicId).toBeDefined();
  });

  test("should require dutyDate", () => {
    const assignment = new DutyAssignment({
      workerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      dutyType: "Vaccination",
    });

    const error = assignment.validateSync();

    expect(error.errors.dutyDate).toBeDefined();
  });

  test("should require dutyType", () => {
    const assignment = new DutyAssignment({
      workerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      dutyDate: new Date(),
    });

    const error = assignment.validateSync();

    expect(error.errors.dutyType).toBeDefined();
  });
});