
jest.mock("../models/InHouseRequest", () => ({
  create: jest.fn(),
}));

jest.mock("../models/FamilyProfile", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/DutyAssignment", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../services/feedbackPromptService", () => ({
  promptAfterInHouseRequest: jest.fn(),
  toPromptSummary: jest.fn(),
  attachClinicToInHouseFeedback: jest.fn(),
}));

const mongoose = require("mongoose");
const InHouseRequest = require("../models/InHouseRequest");
const FamilyProfile = require("../models/FamilyProfile");
const feedbackPrompt = require("../services/feedbackPromptService");

const {
  createRequest,
} = require("../controllers/inHouseController");

describe("M5 - In-House Request Unit Tests", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
      },
      body: {
        address: "House 10, Road 5",
        location: "Dhaka, Mirpur",
        preferredDate: new Date(
          Date.now() + 48 * 60 * 60 * 1000
        ).toISOString(),
        vaccineOrReason: "Vaccination",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    feedbackPrompt.promptAfterInHouseRequest.mockResolvedValue(null);
    feedbackPrompt.toPromptSummary.mockReturnValue(null);
  });

  // TC-U13: Create request with valid data
  test("TC-U13 - creates a valid request with Pending status", async () => {
    const savedRequest = {
      _id: new mongoose.Types.ObjectId(),
      ...req.body,
      citizen: req.user._id,
      familyMember: null,
      status: "Pending",
    };

    InHouseRequest.create.mockResolvedValue(savedRequest);

    await createRequest(req, res);

    expect(InHouseRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        citizen: req.user._id,
        familyMember: null,
        address: req.body.address,
        location: req.body.location,
        vaccineOrReason: req.body.vaccineOrReason,
        status: "Pending",
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        requestId: savedRequest._id,
        data: expect.objectContaining({
          status: "Pending",
        }),
      })
    );
  });

  // TC-U14: Reject an unlinked family profile
  test("TC-U14 - rejects a family profile not linked to the citizen", async () => {
    const familyMemberId = new mongoose.Types.ObjectId().toString();

    req.body.familyMember = familyMemberId;

    FamilyProfile.findOne.mockResolvedValue(null);

    await createRequest(req, res);

    expect(FamilyProfile.findOne).toHaveBeenCalledWith({
      _id: familyMemberId,
      guardianId: req.user._id,
    });

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Family member is not linked to your account",
      })
    );

    expect(InHouseRequest.create).not.toHaveBeenCalled();
  });
});
