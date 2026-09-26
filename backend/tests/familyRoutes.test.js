
const request = require("supertest");
const express = require("express");

const FamilyProfile = require("../models/FamilyProfile");
const familyRoutes = require("../routes/familyRoutes");

// Mock FamilyProfile database methods
jest.mock("../models/FamilyProfile");

// Mock authentication middleware
jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    req.user = {
      id: "test-guardian-id",
    };

    next();
  };
});

const app = express();

app.use(express.json());
app.use("/api/family", familyRoutes);

describe("Family Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/family should add a family member", async () => {
    const familyMember = {
      _id: "family-123",
      guardianId: "test-guardian-id",
      name: "Test Child",
      dateOfBirth: "2020-05-10",
      gender: "Female",
      relationship: "Child",
    };

    FamilyProfile.create.mockResolvedValue(familyMember);

    const response = await request(app)
      .post("/api/family")
      .send({
        name: "Test Child",
        dateOfBirth: "2020-05-10",
        gender: "Female",
        relationship: "Child",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.message).toBe(
      "Family member added successfully"
    );

    expect(response.body.familyMember).toEqual(familyMember);

    expect(FamilyProfile.create).toHaveBeenCalledWith({
      guardianId: "test-guardian-id",
      name: "Test Child",
      dateOfBirth: "2020-05-10",
      gender: "Female",
      relationship: "Child",
    });
  });

  test("GET /api/family should return the logged-in user's family members", async () => {
    const familyMembers = [
      {
        _id: "family-123",
        guardianId: "test-guardian-id",
        name: "Test Child",
        dateOfBirth: "2020-05-10",
        gender: "Female",
        relationship: "Child",
      },
      {
        _id: "family-456",
        guardianId: "test-guardian-id",
        name: "Test Parent",
        dateOfBirth: "1965-03-15",
        gender: "Male",
        relationship: "Parent",
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(familyMembers);

    FamilyProfile.find.mockReturnValue({
      sort: sortMock,
    });

    const response = await request(app)
      .get("/api/family");

    expect(response.statusCode).toBe(200);

    expect(response.body.familyMembers).toEqual(familyMembers);

    expect(FamilyProfile.find).toHaveBeenCalledWith({
      guardianId: "test-guardian-id",
    });

    expect(sortMock).toHaveBeenCalledWith({
      createdAt: -1,
    });
  });

  test("POST /api/family should return 500 when adding a family member fails", async () => {
    FamilyProfile.create.mockRejectedValue(
      new Error("Database error")
    );

    const response = await request(app)
      .post("/api/family")
      .send({
        name: "Test Child",
        dateOfBirth: "2020-05-10",
        gender: "Female",
        relationship: "Child",
      });

    expect(response.statusCode).toBe(500);

    expect(response.body.message).toBe(
      "Failed to add family member"
    );
  });

  test("GET /api/family should return 500 when fetching family members fails", async () => {
    const sortMock = jest.fn().mockRejectedValue(
      new Error("Database error")
    );

    FamilyProfile.find.mockReturnValue({
      sort: sortMock,
    });

    const response = await request(app)
      .get("/api/family");

    expect(response.statusCode).toBe(500);

    expect(response.body.message).toBe(
      "Failed to get family members"
    );
  });
});

