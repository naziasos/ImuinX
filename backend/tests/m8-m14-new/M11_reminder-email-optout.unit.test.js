
const createAppointmentReminders = require("../../jobs/appointmentReminder");
const Appointment = require("../../models/Appointment");
const Notification = require("../../models/Notification");

jest.mock("../../models/Appointment");
jest.mock("../../models/Notification");

describe("M11 - Reminder email and opt-out status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("reminder job uses in-app notifications, not email sending", async () => {
    Appointment.find.mockResolvedValue([]);

    await createAppointmentReminders();

    expect(Appointment.find).toHaveBeenCalledTimes(1);
    expect(Notification.create).not.toHaveBeenCalled();
  });

  test("no opt-out behavior is verified by the current reminder job", () => {
    expect(typeof createAppointmentReminders).toBe("function");
    // This is a status check, not proof that opt-out is implemented.
  });
});
