const Notification = require("../models/Notification");

const MONGO_DUPLICATE_KEY = 11000;

/**
 * Create a notification without ever throwing.
 * A failed notification must never break the booking / certificate flow
 * that triggered it. A `dedupeKey` makes the call idempotent.
 */
async function notifyUser({
  userId,
  type,
  message,
  referenceId = null,
  dedupeKey,
}) {
  if (!userId || !type || !message) return null;

  try {
    const doc = {
      userId,
      type,
      message,
      referenceId: referenceId || null,
    };

    if (dedupeKey) doc.dedupeKey = dedupeKey;

    return await Notification.create(doc);
  } catch (error) {
    if (error && error.code === MONGO_DUPLICATE_KEY) return null;

    console.error("Notification create error:", error.message);
    return null;
  }
}

module.exports = { notifyUser };
