const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const campaign = require("../controllers/campaignController");

// Public: visitors do not need to log in or register.
router.get("/active", campaign.getActiveCampaigns);
router.get("/:id/slots", campaign.getCampaignSlots);
router.post("/:id/book/request-otp", campaign.requestBookingOtp);
router.post("/:id/book/confirm", campaign.confirmBooking);

// Admin only
router.get("/", authMiddleware, adminMiddleware, campaign.listCampaigns);
router.post("/", authMiddleware, adminMiddleware, campaign.createCampaign);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  adminMiddleware,
  campaign.deactivateCampaign
);

module.exports = router;
