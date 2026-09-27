const request = require("supertest");
const express = require("express");

const User = require("../models/User");
const FamilyProfile = require("../models/FamilyProfile");
const VaccineInventory = require("../models/VaccineInventory");
const DoseRecord = require("../models/DoseRecord");
const doseRoutes = require("../routes/doseRoutes");

jest.mock("../models/User");
jest.mock("../models/FamilyProfile");
jest.mock("../models/VaccineInventory");
jest.mock("../models/DoseRecord");

// Mock authentication middleware
jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    req.user = {
      id: "worker-id",
      role: "worker",
    };

    next();
  };
});

const app = express();
app.use(express.json());
app.use("/api/doses", doseRoutes);

const workerUser = {
  _id: "worker-id",
  role: "worker",
  clinicId: "clinic-123",
};

const familyMemberBody = {
  citizenId: "64b7f7f7f7f7f7f7f7f7f7f7",
  citizenType: "family",
  vaccineType: "MMR",
  batchNumber: "BATCH-2025-001",
  dateAdministered: "2025-09-01",
};

const registeredCitizenBody = {
  ...familyMemberBody,
  citizenId: "64b7f7f7f7f7f7f7f7f7f7f8",
  citizenType: "user",
};

describe("Dose Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/doses logs a dose for a FamilyProfile member and decrements inventory", async () => {
    User.findById.mockResolvedValue(workerUser);
    FamilyProfile.findById.mockResolvedValue({
      _id: familyMemberBody.citizenId,
      name: "Alfi Jr.",
    });

    const decrementedInventory = {
      _id: "inventory-1",
      quantity: 4,
      expiryDate: new Date("2030-01-01"),
    };
    VaccineInventory.findOneAndUpdate.mockResolvedValue(decrementedInventory);

    DoseRecord.create.mockResolvedValue({
      _id: "dose-record-1",
      ...familyMemberBody,
      citizenType: "FamilyProfile",
    });

    const response = await request(app)
      .post("/api/doses")
      .send(familyMemberBody);

    expect(response.status).toBe(201);
    expect(response.body.doseRecordId).toBe("dose-record-1");
    expect(FamilyProfile.findById).toHaveBeenCalledWith(
      familyMemberBody.citizenId
    );
    expect(User.findById).not.toHaveBeenCalledWith(
      familyMemberBody.citizenId
    ); // only the logged-in worker was looked up via User
    expect(DoseRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        citizenId: familyMemberBody.citizenId,
        citizenType: "FamilyProfile",
      })
    );
  });

  test("POST /api/doses logs a dose for a registered citizen (User) and decrements inventory", async () => {
    User.findById.mockImplementation((id) =>
      id === "worker-id"
        ? Promise.resolve(workerUser)
        : Promise.resolve({ _id: id, name: "Alfi", role: "citizen" })
    );

    const decrementedInventory = {
      _id: "inventory-1",
      quantity: 9,
      expiryDate: new Date("2030-01-01"),
    };
    VaccineInventory.findOneAndUpdate.mockResolvedValue(decrementedInventory);

    DoseRecord.create.mockResolvedValue({
      _id: "dose-record-2",
      ...registeredCitizenBody,
      citizenType: "User",
    });

    const response = await request(app)
      .post("/api/doses")
      .send(registeredCitizenBody);

    expect(response.status).toBe(201);
    expect(response.body.doseRecordId).toBe("dose-record-2");
    expect(FamilyProfile.findById).not.toHaveBeenCalled();
    expect(DoseRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        citizenId: registeredCitizenBody.citizenId,
        citizenType: "User",
      })
    );
  });

  test("POST /api/doses rejects an invalid citizenType", async () => {
    const response = await request(app)
      .post("/api/doses")
      .send({ ...familyMemberBody, citizenType: "sibling" });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/citizenType/i);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test("POST /api/doses rejects an unknown batch number", async () => {
    User.findById.mockResolvedValue(workerUser);
    FamilyProfile.findById.mockResolvedValue({ _id: "citizen-1" });

    VaccineInventory.findOneAndUpdate.mockResolvedValue(null);
    VaccineInventory.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/doses")
      .send(familyMemberBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/unknown batch/i);
    expect(DoseRecord.create).not.toHaveBeenCalled();
  });

  test("POST /api/doses rejects an expired batch", async () => {
    User.findById.mockResolvedValue(workerUser);
    FamilyProfile.findById.mockResolvedValue({ _id: "citizen-1" });

    VaccineInventory.findOneAndUpdate.mockResolvedValue(null);
    VaccineInventory.findOne.mockResolvedValue({
      _id: "inventory-1",
      quantity: 5,
      expiryDate: new Date("2020-01-01"),
    });

    const response = await request(app)
      .post("/api/doses")
      .send(familyMemberBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/expired/i);
    expect(DoseRecord.create).not.toHaveBeenCalled();
  });

  test("POST /api/doses rejects when batch has no remaining stock", async () => {
    User.findById.mockResolvedValue(workerUser);
    FamilyProfile.findById.mockResolvedValue({ _id: "citizen-1" });

    VaccineInventory.findOneAndUpdate.mockResolvedValue(null);
    VaccineInventory.findOne.mockResolvedValue({
      _id: "inventory-1",
      quantity: 0,
      expiryDate: new Date("2030-01-01"),
    });

    const response = await request(app)
      .post("/api/doses")
      .send(familyMemberBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/no stock remaining/i);
    expect(DoseRecord.create).not.toHaveBeenCalled();
  });

  test("POST /api/doses rolls back inventory decrement if record creation fails", async () => {
    User.findById.mockResolvedValue(workerUser);
    FamilyProfile.findById.mockResolvedValue({ _id: "citizen-1" });

    const decrementedInventory = {
      _id: "inventory-1",
      quantity: 4,
      expiryDate: new Date("2030-01-01"),
    };
    VaccineInventory.findOneAndUpdate.mockResolvedValue(decrementedInventory);
    VaccineInventory.updateOne.mockResolvedValue({});

    const validationError = new Error("Validation failed");
    validationError.name = "ValidationError";
    DoseRecord.create.mockRejectedValue(validationError);

    const response = await request(app)
      .post("/api/doses")
      .send(familyMemberBody);

    expect(response.status).toBe(400);
    expect(VaccineInventory.updateOne).toHaveBeenCalledWith(
      { _id: "inventory-1" },
      { $inc: { quantity: 1 } }
    );
  });

  test("POST /api/doses requires citizenId, citizenType, vaccineType and batchNumber", async () => {
    const response = await request(app).post("/api/doses").send({});

    expect(response.status).toBe(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test("POST /api/doses returns 404 when the citizen does not exist", async () => {
    User.findById.mockResolvedValue(workerUser);
    FamilyProfile.findById.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/doses")
      .send(familyMemberBody);

    expect(response.status).toBe(404);
    expect(VaccineInventory.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("GET /api/doses/citizen/:citizenId?citizenType=family filters by citizenType", async () => {
    const queryMock = {
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      then: (resolve) => resolve([{ _id: "dose-1" }]),
    };

    DoseRecord.find.mockReturnValue(queryMock);

    const response = await request(app).get(
      "/api/doses/citizen/64b7f7f7f7f7f7f7f7f7f7f7?citizenType=family"
    );

    expect(response.status).toBe(200);
    expect(response.body.doses).toEqual([{ _id: "dose-1" }]);
    expect(DoseRecord.find).toHaveBeenCalledWith({
      citizenId: "64b7f7f7f7f7f7f7f7f7f7f7",
      citizenType: "FamilyProfile",
    });
  });

  test("GET /api/doses/citizen/:citizenId rejects an invalid citizenType query", async () => {
    const response = await request(app).get(
      "/api/doses/citizen/64b7f7f7f7f7f7f7f7f7f7f7?citizenType=nope"
    );

    expect(response.status).toBe(400);
    expect(DoseRecord.find).not.toHaveBeenCalled();
  });
});
