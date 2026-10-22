const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const Appointment = require("../models/Appointment");

describe("Campaign model", () => {
  const base = {
    title: "Polio drive",
    vaccineId: new mongoose.Types.ObjectId(),
    startDate: "2026-11-01",
    endDate: "2026-11-10",
  };

  test("accepts a valid campaign", () => {
    expect(new Campaign(base).validateSync()).toBeUndefined();
  });

  test("rejects malformed dates", () => {
    const error = new Campaign({ ...base, startDate: "01/11/2026" }).validateSync();
    expect(error.errors.startDate).toBeDefined();
  });

  test("requires a title and vaccine", () => {
    const error = new Campaign({ startDate: base.startDate, endDate: base.endDate }).validateSync();
    expect(error.errors.title).toBeDefined();
    expect(error.errors.vaccineId).toBeDefined();
  });
});

describe("Guest campaign appointment", () => {
  const common = {
    clinicId: new mongoose.Types.ObjectId(),
    vaccineId: new mongoose.Types.ObjectId(),
    doseNumber: 1,
    dateTime: new Date(Date.now() + 86400000),
  };

  test("needs no citizenId when booked through a campaign", () => {
    const appointment = new Appointment({
      ...common,
      campaignId: new mongoose.Types.ObjectId(),
      guestProfileId: new mongoose.Types.ObjectId(),
      bookingCode: "IMX-ABC234",
    });
    expect(appointment.validateSync()).toBeUndefined();
  });

  test("still requires citizenId for normal bookings", () => {
    const error = new Appointment(common).validateSync();
    expect(error.errors.citizenId).toBeDefined();
  });
});
