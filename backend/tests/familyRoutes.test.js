
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

  
test("PATCH /api/family/:id should update a linked family member", async () => {
  const updatedMember = {
    _id: "family-123",
    guardianId: "test-guardian-id",
    name: "Updated Child",
    dateOfBirth: new Date("2020-05-10"),
    gender: "Female",
    relationship: "Child",
  };

  FamilyProfile.findOneAndUpdate.mockResolvedValue(updatedMember);

  const response = await request(app)
    .patch("/api/family/507f1f77bcf86cd799439011")
    .send({
      name: "Updated Child",
    });

  expect(response.statusCode).toBe(200);

  expect(response.body.message).toBe(
    "Family member profile updated successfully"
  );

  expect(response.body.familyMember).toEqual(
    expect.objectContaining({
      name: "Updated Child",
    })
  );

  expect(FamilyProfile.findOneAndUpdate).toHaveBeenCalledWith(
    {
      _id: "507f1f77bcf86cd799439011",
      guardianId: "test-guardian-id",
    },
    {
      $set: {
        name: "Updated Child",
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );
});

test("PATCH /api/family/:id should reject another guardian's profile", async () => {
  // No document matches BOTH the member ID and current guardian ID.
  FamilyProfile.findOneAndUpdate.mockResolvedValue(null);

  const response = await request(app)
    .patch("/api/family/507f1f77bcf86cd799439011")
    .send({
      name: "Unauthorized Change",
    });

  expect(response.statusCode).toBe(404);

  expect(response.body.message).toBe(
    "Family member not found in your account"
  );

  expect(FamilyProfile.findOneAndUpdate).toHaveBeenCalledWith(
    {
      _id: "507f1f77bcf86cd799439011",
      guardianId: "test-guardian-id",
    },
    {
      $set: {
        name: "Unauthorized Change",
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );
});

test("PATCH /api/family/:id should reject invalid gender", async () => {
  const response = await request(app)
    .patch("/api/family/507f1f77bcf86cd799439011")
    .send({
      gender: "Unknown",
    });

  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe("Invalid gender");

  expect(FamilyProfile.findOneAndUpdate).not.toHaveBeenCalled();
});

test("PATCH /api/family/:id should reject an empty body", async () => {
  const response = await request(app)
    .patch("/api/family/507f1f77bcf86cd799439011")
    .send({});

  expect(response.statusCode).toBe(400);

  expect(response.body.message).toBe(
    "At least one field is required to update"
  );

  expect(FamilyProfile.findOneAndUpdate).not.toHaveBeenCalled();
});

test("PATCH /api/family/:id should reject an invalid member ID", async () => {
  const response = await request(app)
    .patch("/api/family/invalid-id")
    .send({
      name: "Updated Child",
    });

  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe("Invalid family member ID");

  expect(FamilyProfile.findOneAndUpdate).not.toHaveBeenCalled();
});

test("PATCH /api/family/:id should reject non-editable fields", async () => {
  const response = await request(app)
    .patch("/api/family/507f1f77bcf86cd799439011")
    .send({
      guardianId: "another-guardian-id",
    });

  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe("Invalid field(s) provided");

  expect(FamilyProfile.findOneAndUpdate).not.toHaveBeenCalled();
});
});

