
const request = require("supertest");
const express = require("express");

jest.mock("../../models/Clinic");

const Clinic = require("../../models/Clinic");
const clinicRoutes = require("../../routes/clinicRoutes");

const app = express();
app.use(express.json());
app.use("/api/clinics", clinicRoutes);

const origin = {
  latitude: 23.7460,
  longitude: 90.3760,
};

function mockClinics(clinics) {
  Clinic.find.mockReturnValue({
    select: jest.fn().mockResolvedValue(clinics),
  });
}

const sampleClinics = [
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

describe("M13 - Nearby Clinics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-U61: returns nearby clinics sorted nearest first", async () => {
    mockClinics(sampleClinics);

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query(origin);

    expect(response.status).toBe(200);
    expect(response.body.clinics).toHaveLength(2);
    expect(response.body.clinics[0].name).toBe("Near Clinic");
    expect(response.body.clinics[1].name).toBe("Far Clinic");
    expect(response.body.clinics[0].distance)
      .toBeLessThanOrEqual(response.body.clinics[1].distance);
  });

  test("TC-U62: rejects missing coordinates", async () => {
    const response = await request(app)
      .get("/api/clinics/nearby");

    expect(response.status).toBe(400);
    expect(response.body.message)
      .toBe("Valid latitude and longitude are required");
    expect(Clinic.find).not.toHaveBeenCalled();
  });

  test("TC-U62: rejects out-of-range coordinates", async () => {
    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({ latitude: 100, longitude: 90 });

    expect(response.status).toBe(400);
    expect(Clinic.find).not.toHaveBeenCalled();
  });

  test("TC-U63: filters clinics by radius", async () => {
    mockClinics(sampleClinics);

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({ ...origin, radius: 1 });

    expect(response.status).toBe(200);
    expect(response.body.clinics.length).toBe(1);
    expect(response.body.clinics[0].name).toBe("Near Clinic");
    expect(response.body.clinics[0].distance).toBeLessThanOrEqual(1);
  });

  test("TC-U63: limits the number of returned clinics", async () => {
    mockClinics(sampleClinics);

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query({ ...origin, limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.clinics).toHaveLength(1);
    expect(response.body.clinics[0].name).toBe("Near Clinic");
  });

  test("returns an empty list when no eligible clinics exist", async () => {
    mockClinics([]);

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query(origin);

    expect(response.status).toBe(200);
    expect(response.body.clinics).toEqual([]);
  });

  test("returns 500 when the database query fails", async () => {
    Clinic.find.mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("Database error")),
    });

    const response = await request(app)
      .get("/api/clinics/nearby")
      .query(origin);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Failed to fetch nearby clinics");
  });
});
