const request = require("supertest");
const express = require("express");

const Clinic = require("../models/Clinic");
const clinicRoutes = require("../routes/clinicRoutes");

jest.mock("../models/Clinic");
jest.mock("../middleware/authMiddleware", () => (req, res, next) => {
  req.user = { id: "admin-1", role: "admin" };
  next();
});
jest.mock("../middleware/adminMiddleware", () => (req, res, next) => next());

const app = express();
app.use(express.json());
app.use("/api/clinics", clinicRoutes);

const CLINICS = [
  { _id: "a", name: "Near", location: "Dhanmondi", contact: "1", latitude: 23.7465, longitude: 90.376 },
  { _id: "b", name: "Far", location: "Uttara", contact: "2", latitude: 23.8759, longitude: 90.3795 },
];

describe("Nearby clinics: radius and limit", () => {
  beforeEach(() => {
    Clinic.find.mockReturnValue({ select: jest.fn().mockResolvedValue(CLINICS) });
  });

  test("radius filters out clinics that are too far", async () => {
    const res = await request(app)
      .get("/api/clinics/nearby")
      .query({ latitude: 23.746, longitude: 90.376, radius: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.clinics.map((c) => c.name)).toEqual(["Near"]);
  });

  test("limit caps the number of results", async () => {
    const res = await request(app)
      .get("/api/clinics/nearby")
      .query({ latitude: 23.746, longitude: 90.376, limit: 1 });

    expect(res.body.clinics).toHaveLength(1);
  });
});

describe("PATCH /api/clinics/:id/coordinates", () => {
  const validId = "64b7f0c2a1b2c3d4e5f60718";

  test("updates coordinates", async () => {
    Clinic.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ name: "Near", latitude: 23.8, longitude: 90.4 }),
    });

    const res = await request(app)
      .patch(`/api/clinics/${validId}/coordinates`)
      .send({ latitude: 23.8, longitude: 90.4 });

    expect(res.statusCode).toBe(200);
    expect(res.body.clinic.latitude).toBe(23.8);
  });

  test("rejects out-of-range or missing values", async () => {
    const bad = await request(app)
      .patch(`/api/clinics/${validId}/coordinates`)
      .send({ latitude: 123, longitude: 90 });
    const missing = await request(app)
      .patch(`/api/clinics/${validId}/coordinates`)
      .send({ latitude: 23.8 });

    expect(bad.statusCode).toBe(400);
    expect(missing.statusCode).toBe(400);
  });

  test("returns 404 when the clinic does not exist", async () => {
    Clinic.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const res = await request(app)
      .patch(`/api/clinics/${validId}/coordinates`)
      .send({ latitude: 23.8, longitude: 90.4 });

    expect(res.statusCode).toBe(404);
  });
});