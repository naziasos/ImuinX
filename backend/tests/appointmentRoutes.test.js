
const request = require("supertest");
const express = require("express");

// Test-only authentication bypass.
// The actual application middleware is not changed.
jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      id: "507f1f77bcf86cd799439011",
    };
    next();
  };
});

const appointmentRoutes = require("../routes/appointmentRoutes");

const app = express();
app.use(express.json());
app.use("/api/appointments", appointmentRoutes);

describe("M4: Appointment API validation", () => {
  test("Appointment API health endpoint responds successfully", async () => {
    const response = await request(app).get("/api/appointments/test");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      "Appointment API is working."
    );
  });

  test("TC-U18: rejects booking when required fields are missing", async () => {
    const response = await request(app)
      .post("/api/appointments")
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Clinic, vaccine, dose number, date and time are required."
    );
  });

  test("TC-U19: rejects slot request without clinicId and date", async () => {
    const response = await request(app)
      .get("/api/appointments/slots");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "A valid clinicId and date are required."
    );
  });

  test("TC-U19: rejects slot request with invalid clinicId", async () => {
    const response = await request(app)
      .get("/api/appointments/slots")
      .query({
        clinicId: "invalid-clinic-id",
        date: "2027-10-01",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "A valid clinicId and date are required."
    );
  });
});
