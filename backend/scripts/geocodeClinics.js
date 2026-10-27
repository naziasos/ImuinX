/**
 * Fill in missing clinic latitude/longitude from the clinic's address text.
 *
 * Uses OpenStreetMap Nominatim (free, no API key).
 * Nominatim usage policy: max 1 request/second + a real User-Agent.
 *
 * Usage (from /backend):
 *   node scripts/geocodeClinics.js --dry-run     # preview only, writes nothing
 *   node scripts/geocodeClinics.js               # geocode clinics missing coordinates
 *   node scripts/geocodeClinics.js --force       # re-geocode ALL clinics
 *
 * Optional .env:
 *   GEOCODE_COUNTRY=bd          (ISO country code to bias results, default "bd")
 *   GEOCODE_USER_AGENT="ImuniX/1.0 (you@example.com)"
 */
require("dotenv").config();

const mongoose = require("mongoose");
const Clinic = require("../models/Clinic");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const COUNTRY = process.env.GEOCODE_COUNTRY || "bd";
const USER_AGENT =
  process.env.GEOCODE_USER_AGENT || "ImuniX-ClinicFinder/1.0 (student project)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", COUNTRY);

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

  if (!response.ok) {
    throw new Error(`Nominatim responded ${response.status}`);
  }

  const results = await response.json();
  if (!results.length) return null;

  return {
    latitude: Number(results[0].lat),
    longitude: Number(results[0].lon),
    matched: results[0].display_name,
  };
}

// Try the full address first, then progressively shorter versions
// ("Road 5, Uttara, Dhaka" -> "Uttara, Dhaka" -> "Dhaka").
function candidateQueries(location) {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  const queries = [];
  for (let i = 0; i < parts.length; i++) {
    queries.push(parts.slice(i).join(", "));
  }
  return queries.slice(0, 3);
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected", DRY_RUN ? "(dry run)" : "");

  const clinics = await Clinic.collection.find({}).toArray();
  const stats = { scanned: 0, skipped: 0, updated: 0, failed: [] };

  for (const clinic of clinics) {
    stats.scanned++;

    if (!FORCE && isNum(clinic.latitude) && isNum(clinic.longitude)) {
      stats.skipped++;
      continue;
    }

    let found = null;
    for (const query of candidateQueries(clinic.location || "")) {
      try {
        found = await geocode(query);
      } catch (error) {
        console.warn(`  ! ${clinic.name}: ${error.message}`);
      }
      await sleep(1100); // respect 1 request/second
      if (found) break;
    }

    if (!found) {
      stats.failed.push(`${clinic.name} (${clinic.location})`);
      console.log(`✗ ${clinic.name} -> no match, set it manually`);
      continue;
    }

    console.log(
      `✓ ${clinic.name} -> ${found.latitude}, ${found.longitude}\n    ${found.matched}`
    );

    if (!DRY_RUN) {
      await Clinic.collection.updateOne(
        { _id: clinic._id },
        { $set: { latitude: found.latitude, longitude: found.longitude } }
      );
    }
    stats.updated++;
  }

  console.log("\nGeocoding finished");
  console.log(`Scanned: ${stats.scanned}  Already had coords: ${stats.skipped}  ${DRY_RUN ? "Would update" : "Updated"}: ${stats.updated}`);

  if (stats.failed.length) {
    console.log("\nCould not geocode (fix via PATCH /api/clinics/:id/coordinates):");
    stats.failed.forEach((name) => console.log("  - " + name));
  }
}

run()
  .catch((error) => {
    console.error("Geocoding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });