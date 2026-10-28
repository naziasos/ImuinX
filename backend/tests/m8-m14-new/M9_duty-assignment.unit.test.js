const mongoose = require("mongoose");
const DutyAssignment = require("../../models/DutyAssignment");

describe("M9 - Duty Assignment Unit Tests", () => {
  const validDuty = () => ({
    workerId: new mongoose.Types.ObjectId(),
    workerName: "Test Worker",
    workerEmail: "worker@example.test",
    clinicId: new mongoose.Types.ObjectId(),
    dutyDate: new Date("2026-11-02T00:00:00.000Z"),
    dutyType: "Vaccination",
  });

  test("TC-U42: Accept valid duty assignment", async () => {
    const duty = new DutyAssignment(validDuty());

    await expect(duty.validate()).resolves.toBeUndefined();
  });

  test("TC-U44A: Reject missing clinicId", async () => {
    const data = validDuty();
    delete data.clinicId;

    await expect(
      new DutyAssignment(data).validate()
    ).rejects.toThrow(/clinicId/);
  });

  test("TC-U44B: Reject missing dutyDate", async () => {
    const data = validDuty();
    delete data.dutyDate;

    await expect(
      new DutyAssignment(data).validate()
    ).rejects.toThrow(/dutyDate/);
  });

  test("TC-U44C: Reject missing dutyType", async () => {
    const data = validDuty();
    delete data.dutyType;

    await expect(
      new DutyAssignment(data).validate()
    ).rejects.toThrow(/dutyType/);
  });

  test("TC-U42A: Trim whitespace from dutyType", async () => {
    const data = validDuty();
    data.dutyType = "  Vaccination  ";

    const duty = new DutyAssignment(data);

    await duty.validate();

    expect(duty.dutyType).toBe("Vaccination");
  });

  test("TC-U45A: Unique worker-clinic-date index exists", () => {
    const indexes = DutyAssignment.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          {
            workerId: 1,
            clinicId: 1,
            dutyDate: 1,
          },
          expect.objectContaining({
            unique: true,
          }),
        ],
      ])
    );
  });
});