
require("dotenv").config();

const mongoose = require("mongoose");
const Clinic = require("../models/Clinic");

async function migrateClinicCoordinates() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const cursor = Clinic.collection.find(
      {},
      {
        projection: {
          latitude: 1,
          longitude: 1,
        },
      }
    );

    let scanned = 0;
    let updated = 0;

    for await (const clinic of cursor) {
      scanned++;

      const fieldsToSet = {};

      if (!Object.prototype.hasOwnProperty.call(clinic, "latitude")) {
        fieldsToSet.latitude = null;
      }

      if (!Object.prototype.hasOwnProperty.call(clinic, "longitude")) {
        fieldsToSet.longitude = null;
      }

      if (Object.keys(fieldsToSet).length > 0) {
        await Clinic.collection.updateOne(
          { _id: clinic._id },
          { $set: fieldsToSet }
        );

        updated++;
      }
    }

    console.log("\nClinic coordinate migration completed!");
    console.log(`Clinics scanned: ${scanned}`);
    console.log(`Clinics updated: ${updated}`);
    console.log("Existing coordinate values were preserved.");
  } catch (error) {
    console.error("Clinic coordinate migration failed:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected");
    }
  }
}

migrateClinicCoordinates();
