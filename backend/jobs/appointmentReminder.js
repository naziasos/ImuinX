const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");

const createAppointmentReminders = async () => {
  try {
    const now = new Date();

    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    );

    const appointments = await Appointment.find({
      dateTime: {
        $gte: now,
        $lte: twentyFourHoursFromNow,
      },
      status: {
        $in: ["Pending", "Confirmed"],
      },
    });

    for (const appointment of appointments) {
      const existingReminder = await Notification.findOne({
        userId: appointment.citizenId,
        referenceId: appointment._id,
        type: "appointment_reminder",
      });

      if (existingReminder) {
        continue;
      }

      await Notification.create({
        userId: appointment.citizenId,
        type: "appointment_reminder",
        message: `Reminder: Your vaccination appointment is tomorrow at ${appointment.dateTime.toLocaleString()}.`,
        referenceId: appointment._id,
        isRead: false,
      });

      console.log(
        `Reminder created for appointment: ${appointment._id}`
      );
    }

  } catch (error) {
    console.error(
      "Appointment reminder error:",
      error.message
    );
  }
};

module.exports = createAppointmentReminders;