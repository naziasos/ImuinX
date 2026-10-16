
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, message, referenceId } = req.body;

    if (
      typeof type !== "string" ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        message: "Valid type and message are required",
      });
    }

    if (
      referenceId != null &&
      !mongoose.isValidObjectId(referenceId)
    ) {
      return res.status(400).json({
        message: "Invalid referenceId",
      });
    }

    const notification = await Notification.create({
      userId: req.user._id,
      type,
      message: message.trim(),
      referenceId: referenceId || null,
    });

    return res.status(201).json({
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Create notification error:", error.message);

    return res.status(500).json({
      message: "Failed to create notification",
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .lean(),

      Notification.countDocuments({
        userId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("List notifications error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id,
      },
      {
        $set: { isRead: true },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error.message);

    return res.status(500).json({
      message: "Failed to update notification",
    });
  }
});

module.exports = router;
