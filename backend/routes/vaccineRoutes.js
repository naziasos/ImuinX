
const express = require("express");
const router = express.Router();

const {
  createVaccine,
  getVaccines,
} = require("../controllers/vaccineController");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// GET /api/vaccines
// Authenticated users can view the vaccine catalogue.
router.get("/", authMiddleware, getVaccines);

// POST /api/vaccines
// Only admins can create vaccines.
router.post("/", authMiddleware, adminMiddleware, createVaccine);

module.exports = router;
