const request = require("supertest");
const express = require("express");

const appointmentRoutes = require("../routes/appointmentRoutes");

const app = express();

app.use(express.json());
app.use("/api/appointments", appointmentRoutes);
describe("Appointment API", () => {
  test("should return Appointment API is working", async () => {
    const response = await request(app)
      .get("/api/appointments/test");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Appointment API is working");
  });
});
test("should reject booking when required fields are missing", async () => {
  const response = await request(app)
    .post("/api/appointments")
    .send({});

  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe(
    "citizenId, clinicId, date and time are required"
  );
});
test("should reject slot request when clinicId or date is missing", async () => {
  const response = await request(app)
    .get("/api/appointments/slots");

  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe(
    "clinicId and date are required"
  );
});