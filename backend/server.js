const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();



const authRoutes = require("./routes/authRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const vaccineInventoryRoutes = require("./routes/vaccineInventoryRoutes");



const app = express();


app.use(cors());
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/clinics", clinicRoutes);
app.use("/api/vaccine-inventory", vaccineInventoryRoutes);
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