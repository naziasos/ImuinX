const request = require("supertest");
const express = require("express");

jest.mock("../../models/Clinic");

const Clinic = require("../../models/Clinic");
const clinicRoutes = require("../../routes/clinicRoutes");

const app = express();

app.use(express.json());
app.use("/api/clinics", clinicRoutes);

describe("M13 - Additional Nearby Clinics Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-U63A: Reject invalid latitude", async () => {
    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: "abc",
        longitude: 90.4,
      });

    expect(response.status).toBe(400);
    expect(Clinic.find).not.toHaveBeenCalled();
  });

  test("TC-U63B: Reject out-of-range longitude", async () => {
    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: 23.8,
        longitude: -190,
      });

    expect(response.status).toBe(400);
    expect(Clinic.find).not.toHaveBeenCalled();
  });

  test("TC-U61A: Return error if clinic query fails", async () => {
    Clinic.find.mockReturnValue({
      select: jest.fn().mockRejectedValue(
        new Error("Test database failure")
      ),
    });

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: 23.8,
        longitude: 90.4,
      });

    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty("clinics");
  });
});