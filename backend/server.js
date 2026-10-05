const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();



const authRoutes = require("./routes/authRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const vaccineInventoryRoutes = require("./routes/vaccineInventoryRoutes");
const doseRoutes = require("./routes/doseRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const workerAppointmentRoutes = require("./routes/workerAppointmentRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");



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


const familyRoutes = require("./routes/familyRoutes");
app.use("/api/family", familyRoutes);




console.log("🔥 CLINIC ROUTER MOUNTED");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

app.get("/", (req, res) => {
  res.send("ImuniX Backend is Running!");
});