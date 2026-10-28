
const Appointment = require("../../models/Appointment");
const Notification = require("../../models/Notification");
const createAppointmentReminders = require("../../jobs/appointmentReminder");

jest.mock("../../models/Appointment");
jest.mock("../../models/Notification");

describe("M11 - TC-U54: Appointment reminder job", () => {
  let appointment;

  beforeEach(() => {
    jest.clearAllMocks();

    appointment = {
      _id: "507f1f77bcf86cd799439011",
      citizenId: "507f1f77bcf86cd799439012",
      dateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
      status: "Confirmed",
    };

    Appointment.find.mockResolvedValue([appointment]);
    Notification.findOne.mockResolvedValue(null);
    Notification.create.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should search for appointments within the next 24 hours", async () => {
    await createAppointmentReminders();

    expect(Appointment.find).toHaveBeenCalledTimes(1);

    const query = Appointment.find.mock.calls[0][0];

    expect(query.dateTime.$gte).toBeInstanceOf(Date);
    expect(query.dateTime.$lte).toBeInstanceOf(Date);

    expect(
      query.dateTime.$lte.getTime() - query.dateTime.$gte.getTime()
    ).toBe(24 * 60 * 60 * 1000);

    expect(query.status.$in).toEqual(["Pending", "Confirmed"]);
    expect(query.citizenId).toEqual({ $ne: null });
  });

  test("should create a reminder when no existing reminder is found", async () => {
    await createAppointmentReminders();

    expect(Notification.findOne).toHaveBeenCalledWith({
      userId: appointment.citizenId,
      referenceId: appointment._id,
      type: "appointment_reminder",
    });

    expect(Notification.create).toHaveBeenCalledTimes(1);

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: appointment.citizenId,
        type: "appointment_reminder",
        referenceId: appointment._id,
        isRead: false,
      })
    );
  });

  test("should not create a duplicate reminder", async () => {
    Notification.findOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439099",
      userId: appointment.citizenId,
      referenceId: appointment._id,
      type: "appointment_reminder",
    });

    await createAppointmentReminders();

    expect(Notification.findOne).toHaveBeenCalledTimes(1);
    expect(Notification.create).not.toHaveBeenCalled();
  });

  test("should not create a reminder when there are no eligible appointments", async () => {
    Appointment.find.mockResolvedValue([]);

    await createAppointmentReminders();

    expect(Notification.findOne).not.toHaveBeenCalled();
    expect(Notification.create).not.toHaveBeenCalled();
  });

  test("should handle appointment query errors without throwing", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    Appointment.find.mockRejectedValue(new Error("Database unavailable"));

    await expect(createAppointmentReminders()).resolves.toBeUndefined();

    expect(Notification.create).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
