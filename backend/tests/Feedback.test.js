const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");

const oid = () => new mongoose.Types.ObjectId();

// Minimal valid document = what POST /api/doses would create (Pending)
const baseData = (overrides = {}) => ({
  doseRecordId: oid(),
  appointmentId: oid(),
  clinicId: oid(),
  userId: oid(),
  citizenId: oid(),
  citizenType: "User",
  vaccineType: "COVID-19",
  ...overrides,
});

const submittedData = (overrides = {}) =>
  baseData({
    promptStatus: "Submitted",
    rating: 5,
    comment: "Very friendly staff",
    submittedAt: new Date(),
    ...overrides,
  });

describe("Feedback Schema", () => {
  // -------------------------------------------------------------
  // Creation & defaults
  // -------------------------------------------------------------
  describe("creation and defaults", () => {
    test("should create a valid Pending feedback without rating", () => {
      const feedback = new Feedback(baseData());

      expect(feedback.validateSync()).toBeUndefined();
    });

    test("should apply default values", () => {
      const feedback = new Feedback(baseData());

      expect(feedback.promptStatus).toBe("Pending");
      expect(feedback.reviewStatus).toBe("New");
      expect(feedback.dismissCount).toBe(0);
      expect(feedback.lastDismissedAt).toBeNull();
      expect(feedback.rating).toBeNull();
      expect(feedback.comment).toBe("");
      expect(feedback.tags).toHaveLength(0);
      expect(feedback.isAnonymous).toBe(false);
      expect(feedback.submittedAt).toBeNull();
      expect(feedback.responses).toHaveLength(0);
      expect(feedback.resolvedBy).toBeNull();
      expect(feedback.resolvedAt).toBeNull();
    });

    test("should create a valid Submitted feedback", () => {
      const feedback = new Feedback(submittedData());

      expect(feedback.validateSync()).toBeUndefined();
      expect(feedback.promptStatus).toBe("Submitted");
    });

    test("should allow a FamilyProfile as the vaccinated person", () => {
      const feedback = new Feedback(baseData({ citizenType: "FamilyProfile" }));

      expect(feedback.validateSync()).toBeUndefined();
    });

    test("should allow appointmentId to be null", () => {
      const feedback = new Feedback(baseData({ appointmentId: null }));

      expect(feedback.validateSync()).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Required fields & enums
  // -------------------------------------------------------------
  describe("required fields and enums", () => {
    test("should require all link fields and vaccineType", () => {
      const error = new Feedback({}).validateSync();

      expect(error).toBeDefined();
      expect(error.errors.doseRecordId).toBeDefined();
      expect(error.errors.clinicId).toBeDefined();
      expect(error.errors.userId).toBeDefined();
      expect(error.errors.citizenId).toBeDefined();
      expect(error.errors.citizenType).toBeDefined();
      expect(error.errors.vaccineType).toBeDefined();
    });

    test("should reject invalid citizenType", () => {
      const error = new Feedback(
        baseData({ citizenType: "Clinic" })
      ).validateSync();

      expect(error.errors.citizenType).toBeDefined();
    });

    test("should reject invalid promptStatus", () => {
      const error = new Feedback(
        baseData({ promptStatus: "Skipped" })
      ).validateSync();

      expect(error.errors.promptStatus).toBeDefined();
    });

    test("should reject invalid reviewStatus", () => {
      const error = new Feedback(
        baseData({ reviewStatus: "Closed" })
      ).validateSync();

      expect(error.errors.reviewStatus).toBeDefined();
    });

    test.each(["New", "Responded", "Resolved"])(
      "should accept reviewStatus %s",
      (reviewStatus) => {
        const feedback = new Feedback(submittedData({ reviewStatus }));

        expect(feedback.validateSync()).toBeUndefined();
      }
    );

    test("should trim vaccineType", () => {
      const feedback = new Feedback(baseData({ vaccineType: "  MMR  " }));

      expect(feedback.vaccineType).toBe("MMR");
    });
  });

  // -------------------------------------------------------------
  // Rating
  // -------------------------------------------------------------
  describe("rating", () => {
    test.each([1, 2, 3, 4, 5])("should accept rating %i", (rating) => {
      const feedback = new Feedback(submittedData({ rating }));

      expect(feedback.validateSync()).toBeUndefined();
    });

    test.each([0, -1, 6, 10])("should reject out-of-range rating %i", (rating) => {
      const error = new Feedback(submittedData({ rating })).validateSync();

      expect(error.errors.rating).toBeDefined();
    });

    test("should reject non-integer rating", () => {
      const error = new Feedback(submittedData({ rating: 3.5 })).validateSync();

      expect(error.errors.rating).toBeDefined();
      expect(error.errors.rating.message).toMatch(/whole number/i);
    });

    test("should allow null rating on a Pending feedback", () => {
      const feedback = new Feedback(baseData({ rating: null }));

      expect(feedback.validateSync()).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Comment, tags, anonymity
  // -------------------------------------------------------------
  describe("comment, tags and anonymity", () => {
    test("should trim comment", () => {
      const feedback = new Feedback(submittedData({ comment: "  Great  " }));

      expect(feedback.comment).toBe("Great");
    });

    test("should accept a comment of exactly 1000 characters", () => {
      const feedback = new Feedback(
        submittedData({ comment: "a".repeat(1000) })
      );

      expect(feedback.validateSync()).toBeUndefined();
    });

    test("should reject a comment longer than 1000 characters", () => {
      const error = new Feedback(
        submittedData({ comment: "a".repeat(1001) })
      ).validateSync();

      expect(error.errors.comment).toBeDefined();
    });

    test("should accept valid tags", () => {
      const feedback = new Feedback(
        submittedData({ tags: ["Staff Behavior", "Waiting Time", "Cleanliness"] })
      );

      expect(feedback.validateSync()).toBeUndefined();
      expect(feedback.tags).toHaveLength(3);
    });

    test("should reject an unknown tag", () => {
      const error = new Feedback(
        submittedData({ tags: ["Staff Behavior", "Parking"] })
      ).validateSync();

      expect(error).toBeDefined();
      expect(error.errors["tags.1"]).toBeDefined();
    });

    test("should store isAnonymous when set", () => {
      const feedback = new Feedback(submittedData({ isAnonymous: true }));

      expect(feedback.isAnonymous).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // "Maybe Later" tracking
  // -------------------------------------------------------------
  describe("dismiss tracking", () => {
    test("should accept a positive dismissCount and lastDismissedAt", () => {
      const feedback = new Feedback(
        baseData({ dismissCount: 2, lastDismissedAt: new Date() })
      );

      expect(feedback.validateSync()).toBeUndefined();
      expect(feedback.dismissCount).toBe(2);
    });

    test("should reject a negative dismissCount", () => {
      const error = new Feedback(baseData({ dismissCount: -1 })).validateSync();

      expect(error.errors.dismissCount).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Staff / admin responses (embedded)
  // -------------------------------------------------------------
  describe("responses", () => {
    const validResponse = (overrides = {}) => ({
      responderId: oid(),
      responderRole: "clinicAdmin",
      message: "Thank you, we will improve.",
      ...overrides,
    });

    test("should accept valid responses from worker, clinicAdmin and admin", () => {
      const feedback = new Feedback(
        submittedData({
          responses: [
            validResponse({ responderRole: "worker" }),
            validResponse({ responderRole: "clinicAdmin" }),
            validResponse({ responderRole: "admin" }),
          ],
        })
      );

      expect(feedback.validateSync()).toBeUndefined();
      expect(feedback.responses).toHaveLength(3);
    });

    test("should require responderId, responderRole and message", () => {
      const error = new Feedback(
        submittedData({ responses: [{}] })
      ).validateSync();

      expect(error.errors["responses.0.responderId"]).toBeDefined();
      expect(error.errors["responses.0.responderRole"]).toBeDefined();
      expect(error.errors["responses.0.message"]).toBeDefined();
    });

    test("should not allow a citizen to respond", () => {
      const error = new Feedback(
        submittedData({ responses: [validResponse({ responderRole: "citizen" })] })
      ).validateSync();

      expect(error.errors["responses.0.responderRole"]).toBeDefined();
    });

    test("should reject a response message longer than 1000 characters", () => {
      const error = new Feedback(
        submittedData({
          responses: [validResponse({ message: "a".repeat(1001) })],
        })
      ).validateSync();

      expect(error.errors["responses.0.message"]).toBeDefined();
    });

    test("should trim response message", () => {
      const feedback = new Feedback(
        submittedData({ responses: [validResponse({ message: "  Thanks  " })] })
      );

      expect(feedback.responses[0].message).toBe("Thanks");
    });

    test("should only track createdAt on a response", () => {
      const responseSchema = Feedback.schema.path("responses").schema;

      expect(responseSchema.path("createdAt")).toBeDefined();
      expect(responseSchema.path("updatedAt")).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // pre("validate") hook
  // NOTE: validateSync() does not run middleware, so use validate().
  // -------------------------------------------------------------
  describe("submitted feedback must have a rating", () => {
    test("should reject Submitted feedback without rating", async () => {
      const feedback = new Feedback(submittedData({ rating: null }));

      await expect(feedback.validate()).rejects.toMatchObject({
        errors: {
          rating: expect.anything(),
        },
      });
    });

    test("should accept Submitted feedback with a rating", async () => {
      const feedback = new Feedback(submittedData({ rating: 4 }));

      await expect(feedback.validate()).resolves.toBeUndefined();
    });

    test("should accept Pending feedback without a rating", async () => {
      const feedback = new Feedback(baseData());

      await expect(feedback.validate()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Immutable link fields
  // -------------------------------------------------------------
  describe("immutable fields", () => {
    test("should not change link fields after the document is saved", () => {
      const data = baseData();
      const feedback = new Feedback(data);

      // Simulate an already-saved document
      feedback.$isNew = false;

      feedback.doseRecordId = oid();
      feedback.clinicId = oid();
      feedback.userId = oid();
      feedback.citizenId = oid();
      feedback.citizenType = "FamilyProfile";

      expect(String(feedback.doseRecordId)).toBe(String(data.doseRecordId));
      expect(String(feedback.clinicId)).toBe(String(data.clinicId));
      expect(String(feedback.userId)).toBe(String(data.userId));
      expect(String(feedback.citizenId)).toBe(String(data.citizenId));
      expect(feedback.citizenType).toBe("User");
    });

    test("should still allow content fields to change after save", () => {
      const feedback = new Feedback(baseData());

      feedback.$isNew = false;

      feedback.promptStatus = "Submitted";
      feedback.rating = 5;

      expect(feedback.promptStatus).toBe("Submitted");
      expect(feedback.rating).toBe(5);
    });
  });

  // -------------------------------------------------------------
  // Indexes
  // -------------------------------------------------------------
  describe("indexes", () => {
    const indexes = Feedback.schema.indexes();

    const findIndex = (fields) =>
      indexes.find(([spec]) => JSON.stringify(spec) === JSON.stringify(fields));

    test("should have a unique index on doseRecordId (one feedback per dose)", () => {
      const index = findIndex({ doseRecordId: 1 });

      expect(index).toBeDefined();
      expect(index[1]).toMatchObject({ unique: true });
    });

    test("should have an index for the citizen's pending list", () => {
      expect(
        findIndex({ userId: 1, promptStatus: 1, createdAt: -1 })
      ).toBeDefined();
    });

    test("should have an index for the clinic dashboard", () => {
      expect(
        findIndex({
          clinicId: 1,
          promptStatus: 1,
          reviewStatus: 1,
          submittedAt: -1,
        })
      ).toBeDefined();
    });

    test("should have an index for clinic rating queries", () => {
      expect(findIndex({ clinicId: 1, rating: 1 })).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Timestamps
  // -------------------------------------------------------------
  test("should have createdAt and updatedAt timestamps", () => {
    expect(Feedback.schema.path("createdAt")).toBeDefined();
    expect(Feedback.schema.path("updatedAt")).toBeDefined();
  });
});