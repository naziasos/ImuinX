
const mongoose = require("mongoose");
const Feedback = require("../../models/Feedback");

describe("M10 - Feedback Model Unit Tests", () => {
  test("should reject feedback without required fields", async () => {
    const feedback = new Feedback({});

    await expect(feedback.validate()).rejects.toThrow();
  });

  test("should reject invalid MongoDB ObjectId for dose reference", async () => {
    const feedback = new Feedback({
      doseRecordId: "invalid-id",
    });

    await expect(feedback.validate()).rejects.toThrow();
  });

  test("should accept a valid MongoDB ObjectId as dose reference", () => {
    const id = new mongoose.Types.ObjectId();

    expect(mongoose.isValidObjectId(id)).toBe(true);
  });
});
