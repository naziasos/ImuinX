
const express = require("express");
const router = express.Router();

const {
  createVaccine,
} = require("../controllers/vaccineController");

// POST /api/vaccines
router.post("/", createVaccine);

module.exports = router;
