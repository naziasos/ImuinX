const mongoose = require("mongoose");
const DoseRecord = require("../models/DoseRecord");

describe("DoseRecord Schema", () => {
  test("should create a valid dose record", () => {
    const record = new DoseRecord({
      citizenId: new mongoose.Types.ObjectId(),
      vaccineType: "MMR",
      batchNumber: "BATCH-2025-001",
      dateAdministered: new Date("2025-09-01"),
      healthWorkerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
    });

    const error = record.validateSync();

    expect(error).toBeUndefined();
  });

  test("should default dateAdministered to now when not provided", () => {
    const record = new DoseRecord({
      citizenId: new mongoose.Types.ObjectId(),
      vaccineType: "MMR",
      batchNumber: "BATCH-2025-001",
      healthWorkerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
    });

    const error = record.validateSync();

    expect(error).toBeUndefined();
    expect(record.dateAdministered).toBeInstanceOf(Date);
  });

  test("should require all required fields", () => {
    const record = new DoseRecord({});

    const error = record.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.citizenId).toBeDefined();
    expect(error.errors.vaccineType).toBeDefined();
    expect(error.errors.batchNumber).toBeDefined();
    expect(error.errors.healthWorkerId).toBeDefined();
    expect(error.errors.clinicId).toBeDefined();
  });

  test("should reject a future dateAdministered", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const record = new DoseRecord({
      citizenId: new mongoose.Types.ObjectId(),
      vaccineType: "MMR",
      batchNumber: "BATCH-2025-001",
      dateAdministered: futureDate,
      healthWorkerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
    });

    const error = record.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.dateAdministered).toBeDefined();
  });

  test("should trim whitespace on vaccineType and batchNumber", () => {
    const record = new DoseRecord({
      citizenId: new mongoose.Types.ObjectId(),
      vaccineType: "  MMR  ",
      batchNumber: "  BATCH-2025-001  ",
      healthWorkerId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
    });

    expect(record.vaccineType).toBe("MMR");
    expect(record.batchNumber).toBe("BATCH-2025-001");
  });
});