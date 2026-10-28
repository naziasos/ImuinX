const mongoose = require("mongoose");
const Feedback = require("../../models/Feedback");

describe("M10 - Additional Feedback Unit Tests", () => {
  const validFeedback = (extra = {}) =>
    new Feedback({
      feedbackType: "Vaccination",
      doseRecordId: new mongoose.Types.ObjectId(),
      clinicId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      citizenId: new mongoose.Types.ObjectId(),
      citizenType: "User",
      vaccineType: "Test Vaccine",
      ...extra,
    });

  test.each([0, 6, 2.5, -1])(
    "TC-U46: Reject invalid rating %s",
    async (rating) => {
      const feedback = validFeedback({
        rating,
        promptStatus: "Submitted",
      });

      await expect(feedback.validate()).rejects.toThrow();
    }
  );

  test("TC-U46A: Reject submitted feedback without rating", async () => {
    const feedback = validFeedback({
      promptStatus: "Submitted",
      rating: null,
    });

    await expect(feedback.validate()).rejects.toThrow(/rating/i);
  });

  test("TC-U46B: Accept valid integer rating", async () => {
    const feedback = validFeedback({
      promptStatus: "Submitted",
      rating: 5,
    });

    await expect(feedback.validate()).resolves.toBeUndefined();
  });

  test("TC-U50A: Reject citizen as feedback responder", async () => {
    const feedback = validFeedback({
      responses: [
        {
          responderId: new mongoose.Types.ObjectId(),
          responderRole: "citizen",
          message: "Test reply",
        },
      ],
    });

    await expect(feedback.validate()).rejects.toThrow();
  });

  test("TC-U47A: Unique dose feedback index exists", () => {
    const indexes = Feedback.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { doseRecordId: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: {
              doseRecordId: { $type: "objectId" },
            },
          }),
        ],
      ])
    );
  });
});