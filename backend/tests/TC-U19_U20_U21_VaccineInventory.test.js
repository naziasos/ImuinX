
const User = require("../models/User");
const Vaccine = require("../models/Vaccine");
const VaccineInventory = require("../models/VaccineInventory");
const { createInventory } = require("../controllers/vaccineInventoryController");

jest.mock("../models/User");
jest.mock("../models/Vaccine");
jest.mock("../models/VaccineInventory");

describe("M7 - Vaccine Inventory Unit Tests", () => {
  let req;
  let res;

  const clinicId = "650000000000000000000001";
  const userId = "650000000000000000000002";
  const vaccineId = "650000000000000000000003";

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: userId },
      body: {
        vaccineId,
        batchNumber: "BATCH-M7-001",
        quantity: 100,
        expiryDate: "2030-12-31",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    User.findById.mockResolvedValue({
      _id: userId,
      clinicId,
      role: "clinicAdmin",
    });

    Vaccine.findById.mockResolvedValue({
      _id: vaccineId,
      isActive: true,
      active: true,
    });

    VaccineInventory.findOne.mockResolvedValue(null);

    VaccineInventory.create.mockImplementation(async (data) => ({
      _id: "650000000000000000000004",
      ...data,
    }));
  });

  test("TC-U19: Valid batch should be created successfully", async () => {
    await createInventory(req, res);

    expect(VaccineInventory.create).toHaveBeenCalledTimes(1);
    expect(VaccineInventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        vaccineId,
        clinicId,
        batchNumber: "BATCH-M7-001",
        quantity: 100,
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryId: "650000000000000000000004",
      })
    );
  });

  test("TC-U20: Duplicate batch number should be rejected", async () => {
    VaccineInventory.findOne.mockResolvedValue({
      _id: "650000000000000000000005",
      batchNumber: "BATCH-M7-001",
      clinicId,
    });

    await createInventory(req, res);

    expect(VaccineInventory.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("TC-U21: Past expiry date should be rejected", async () => {
    req.body.expiryDate = "2020-01-01";

    await createInventory(req, res);

    expect(VaccineInventory.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
