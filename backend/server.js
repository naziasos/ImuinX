const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
require("dotenv").config();



const authRoutes = require("./routes/authRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const vaccineInventoryRoutes = require("./routes/vaccineInventoryRoutes");
const doseRoutes = require("./routes/doseRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const workerAppointmentRoutes = require("./routes/workerAppointmentRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const clinicFeedbackRoutes = require("./routes/clinicFeedbackRoutes");
const inHouseRoutes = require("./routes/inHouseRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const createAppointmentReminders = require("./jobs/appointmentReminder");
const runMissedDoseDetectionJob = require("./jobs/missedDoseDetection");

const vaccineRoutes = require("./routes/vaccineRoutes");
const vaccineScheduleRoutes = require("./routes/vaccineScheduleRoutes");
const recoveryRoutes = require("./routes/recoveryRoutes");

const app = express();


app.use(cors());
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/clinics", clinicRoutes);
app.use("/api/vaccine-inventory", vaccineInventoryRoutes);
app.use("/api/doses", doseRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use(
  "/api/worker-appointments",
  workerAppointmentRoutes
);
app.use("/api/certificates", certificateRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/clinic-feedback", clinicFeedbackRoutes);
app.use("/api/notifications", notificationRoutes);

const familyRoutes = require("./routes/familyRoutes");
app.use("/api/family", familyRoutes);
app.use("/api/in-house-requests", inHouseRoutes);

app.use("/api/vaccines", vaccineRoutes);
app.use("/api/vaccine-schedules", vaccineScheduleRoutes);
app.use("/api/recovery", recoveryRoutes);







const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");
    await require("./services/feedbackPromptService").ensureFeedbackIndexes();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    cron.schedule("0 * * * *", async () => {
      await createAppointmentReminders();
    });

    // Detect overdue vaccine doses once per day in the application's
    // local timezone. Run once after startup as well, so missed doses
    // are not delayed until the next midnight after a deployment.
    cron.schedule(
      "15 0 * * *",
      async () => {
        try {
          await runMissedDoseDetectionJob();
        } catch (error) {
          console.error("Scheduled missed-dose job error:", error.message);
        }
      },
      { timezone: process.env.APP_TIMEZONE || "Asia/Dhaka" }
    );

    runMissedDoseDetectionJob().catch((error) => {
      console.error("Initial missed-dose job error:", error.message);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

app.get("/", (req, res) => {
  res.send("ImuniX Backend is Running!");
});