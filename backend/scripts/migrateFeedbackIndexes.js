/*
 * One-time migration for the new feedback types.
 *
 * The old Feedback collection has a plain unique index on doseRecordId.
 * Appointment / in-house feedback has no dose, so that index must become a
 * partial one. Also back-fills feedbackType on existing documents.
 *
 * Run once:  node scripts/migrateFeedbackIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const filled = await Feedback.updateMany(
      { feedbackType: { $exists: false } },
      { $set: { feedbackType: "Vaccination", inHouseRequestId: null } }
    );
    console.log(`Back-filled feedbackType on ${filled.modifiedCount} docs`);

    try {
      await Feedback.collection.dropIndex("doseRecordId_1");
      console.log("Dropped old doseRecordId_1 index");
    } catch (error) {
      console.log("Old doseRecordId_1 index not dropped:", error.message);
    }

    await Feedback.syncIndexes();
    console.log("Indexes synced");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
}

run();
