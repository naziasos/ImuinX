const mongoose = require("mongoose");
const FamilyProfile = require("../models/FamilyProfile");

describe("FamilyProfile Schema", () => {
  test("should create a valid family profile", () => {
    const profile = new FamilyProfile({
      guardianId: new mongoose.Types.ObjectId(),
      name: "Rafi",
      dateOfBirth: new Date("2018-06-10"),
      gender: "Male",
      relationship: "Child",
    });

    const error = profile.validateSync();

    expect(error).toBeUndefined();
  });

  test("should require all required fields", () => {
    const profile = new FamilyProfile({});

    const error = profile.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.guardianId).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.dateOfBirth).toBeDefined();
    expect(error.errors.gender).toBeDefined();
    expect(error.errors.relationship).toBeDefined();
  });

  test("should reject an invalid relationship", () => {
    const profile = new FamilyProfile({
      guardianId: new mongoose.Types.ObjectId(),
      name: "Rafi",
      dateOfBirth: new Date("2018-06-10"),
      gender: "Male",
      relationship: "Friend",
    });

    const error = profile.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.relationship).toBeDefined();
  });

  test("should reject an invalid gender", () => {
    const profile = new FamilyProfile({
      guardianId: new mongoose.Types.ObjectId(),
      name: "Rafi",
      dateOfBirth: new Date("2018-06-10"),
      gender: "Unknown",
      relationship: "Child",
    });

    const error = profile.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.gender).toBeDefined();
  });
});