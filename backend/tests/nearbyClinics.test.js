
const request = require("supertest");
const express = require("express");

const Clinic = require("../models/Clinic");
const clinicRoutes = require("../routes/clinicRoutes");

jest.mock("../models/Clinic");

const app = express();
app.use(express.json());
app.use("/api/clinics", clinicRoutes);

describe("Nearby Clinics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns clinics sorted by nearest distance first", async () => {
    const clinics = [
      {
        _id: "clinic-far",
        name: "Far Clinic",
        location: "Uttara, Dhaka",
        contact: "01700000002",
        latitude: 23.8759,
        longitude: 90.3795,
      },
      {
        _id: "clinic-near",
        name: "Near Clinic",
        location: "Dhanmondi, Dhaka",
        contact: "01700000001",
        latitude: 23.7465,
        longitude: 90.3760,
      },
    ];

    Clinic.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(clinics),
    });

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: 23.7460,
        longitude: 90.3760,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.clinics).toHaveLength(2);

    expect(response.body.clinics[0].name).toBe("Near Clinic");
    expect(response.body.clinics[1].name).toBe("Far Clinic");

    for (const clinic of response.body.clinics) {
      expect(typeof clinic.distance).toBe("number");
      expect(typeof clinic.latitude).toBe("number");
      expect(typeof clinic.longitude).toBe("number");
      expect(clinic.address).toBeDefined();
      expect(clinic.contact).toBeDefined();
    }

    expect(
      response.body.clinics[0].distance
    ).toBeLessThanOrEqual(
      response.body.clinics[1].distance
    );
  });

  test("rejects a request without coordinates", async () => {
    const response = await request(app)
      .get("/api/clinics/nearby");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Valid latitude and longitude are required"
    );
    expect(Clinic.find).not.toHaveBeenCalled();
  });

  test("rejects coordinates outside valid ranges", async () => {
    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: 100,
        longitude: 90,
      });

    expect(response.statusCode).toBe(400);
    expect(Clinic.find).not.toHaveBeenCalled();
  });

  test("returns an empty list when no clinics have coordinates", async () => {
    Clinic.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: 23.7808,
        longitude: 90.4070,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.clinics).toEqual([]);
  });

  test("handles database errors", async () => {
    Clinic.find.mockReturnValue({
      select: jest.fn().mockRejectedValue(
        new Error("Database error")
      ),
    });

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({
        latitude: 23.7808,
        longitude: 90.4070,
      });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe(
      "Failed to fetch nearby clinics"
    );
  });
});
