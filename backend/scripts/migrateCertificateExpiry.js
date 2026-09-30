require("dotenv").config();

const mongoose = require("mongoose");
const Certificate = require("../models/Certificate");

const VALIDITY_DAYS = Number(process.env.CERTIFICATE_VALIDITY_DAYS || 365);

async function migrateCertificateExpiry() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const certificates = await Certificate.find({
      $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }],
    }).select("_id issuedDate");

    console.log(`Found ${certificates.length} certificate(s) without expiryDate`);

    let updated = 0;
    let skipped = 0;

    for (const certificate of certificates) {
      const issuedMs = new Date(certificate.issuedDate).getTime();
      if (Number.isNaN(issuedMs)) {
        console.log(`Skipped ${certificate._id}: issuedDate is invalid`);
        skipped++;
        continue;
      }

      const expiryDate = new Date(issuedMs);
      expiryDate.setDate(expiryDate.getDate() + VALIDITY_DAYS);

      await Certificate.collection.updateOne(
        { _id: certificate._id },
        { $set: { expiryDate } }
      );

      console.log(`Updated ${certificate._id} -> ${expiryDate.toISOString()}`);
      updated++;
    }

    console.log("\nMigration completed!");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
  } catch (error) {
    console.error("Migration error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
}

migrateCertificateExpiry();