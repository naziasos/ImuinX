
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function migrateUserProfileDetails() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Read existing raw documents without overwriting their data.
    const cursor = User.collection.find(
      {},
      {
        projection: {
          phoneNumber: 1,
          address: 1,
          dateOfBirth: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    let scanned = 0;
    let updated = 0;

    for await (const user of cursor) {
      scanned++;

      const fieldsToSet = {};

      // Add only fields that are missing.
      // Existing values are never overwritten.
      for (const field of [
        "phoneNumber",
        "address",
        "dateOfBirth",
      ]) {
        if (!Object.prototype.hasOwnProperty.call(user, field)) {
          fieldsToSet[field] = null;
        }
      }

      // Preserve existing timestamps.
      // Use createdAt if available for older records.
      if (!Object.prototype.hasOwnProperty.call(user, "updatedAt")) {
        fieldsToSet.updatedAt =
          user.createdAt || new Date();
      }

      if (Object.keys(fieldsToSet).length > 0) {
        await User.collection.updateOne(
          { _id: user._id },
          { $set: fieldsToSet }
        );

        updated++;
      }
    }

    console.log("\nUser profile migration completed!");
    console.log(`Users scanned: ${scanned}`);
    console.log(`Users updated: ${updated}`);
    console.log("Existing profile values were preserved.");
  } catch (error) {
    console.error("User profile migration failed:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected");
    }
  }
}

migrateUserProfileDetails();