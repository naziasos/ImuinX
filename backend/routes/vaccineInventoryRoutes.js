
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createInventory,
  getMyClinicInventory,
  updateInventory,
  deleteInventory,
} = require("../controllers/vaccineInventoryController");





router.post("/", authMiddleware, createInventory);

router.get("/my-clinic", authMiddleware, getMyClinicInventory);

router.put("/:id", authMiddleware, updateInventory);

router.delete("/:id", authMiddleware, deleteInventory);

module.exports = router;