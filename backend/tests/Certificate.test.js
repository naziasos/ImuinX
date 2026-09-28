const mongoose = require("mongoose");
const Certificate = require("../models/Certificate");

const validData = () => ({
  citizenId: new mongoose.Types.ObjectId(),
  citizenType: "FamilyProfile",
  doseRecordId: new mongoose.Types.ObjectId(),
});

describe("Certificate Schema", () => {
  test("should create a valid certificate with only citizen and dose reference", () => {
    const cert = new Certificate(validData());

    const error = cert.validateSync();

    expect(error).toBeUndefined();
  });

  test("should auto-generate a 64-char hex qrToken", () => {
    const cert = new Certificate(validData());

    expect(cert.qrToken).toMatch(/^[a-f0-9]{64}$/);
  });

  test("should generate a different qrToken for each certificate", () => {
    const a = new Certificate(validData());
    const b = new Certificate(validData());

    expect(a.qrToken).not.toBe(b.qrToken);
  });

  test("should default issuedDate to now", () => {
    const before = Date.now();
    const cert = new Certificate(validData());

    expect(cert.issuedDate).toBeInstanceOf(Date);
    expect(cert.issuedDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(cert.issuedDate.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("should require citizenId, citizenType and doseRecordId", () => {
    const cert = new Certificate({});

    const error = cert.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.citizenId).toBeDefined();
    expect(error.errors.citizenType).toBeDefined();
    expect(error.errors.doseRecordId).toBeDefined();
  });

  test("should reject a citizenType outside the allowed enum", () => {
    const cert = new Certificate({ ...validData(), citizenType: "SomeOtherModel" });

    const error = cert.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.citizenType).toBeDefined();
  });

  test("should accept 'User' as a citizenType", () => {
    const cert = new Certificate({ ...validData(), citizenType: "User" });

    expect(cert.validateSync()).toBeUndefined();
  });

  test("should define unique indexes on qrToken and doseRecordId", () => {
    const indexes = Certificate.schema.indexes();
    const hasUniqueDose = indexes.some(
      ([fields, opts]) => fields.doseRecordId === 1 && opts.unique === true
    );

    expect(Certificate.schema.path("qrToken").options.unique).toBe(true);
    expect(hasUniqueDose).toBe(true);
  });
});