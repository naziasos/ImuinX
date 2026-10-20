require("dotenv").config();

const mongoose = require("mongoose");
const CatchUpSchedule = require("../models/CatchUpSchedule");
const VaccineSchedule = require("../models/VaccineSchedule");

async function migrateRecoveryIndexes() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Inspect existing schedule records before changing indexes.
    const totalSchedules = await VaccineSchedule.countDocuments();

    const unverifiedSchedules =
      await VaccineSchedule.countDocuments({
        isApproved: { $ne: true },
      });

    console.log("Existing vaccine schedules:", totalSchedules);
    console.log("Schedules not approved for recovery:", unverifiedSchedules);

    // Create indexes for the new recovery collection.
    // Do not use syncIndexes() on existing collections here.
    await CatchUpSchedule.createIndexes();

    console.log("Recovery indexes created successfully");

    const indexes = await CatchUpSchedule.collection.indexes();

    console.log(
      "CatchUpSchedule indexes:",
      indexes.map((index) => index.name)
    );
  } catch (error) {
    console.error("Recovery migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
}

migrateRecoveryIndexes();