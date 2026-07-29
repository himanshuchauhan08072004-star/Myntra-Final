const express = require("express");
const Notification = require("../models/Notification");
const NotificationPreference = require("../models/NotificationPreference");
const User = require("../models/User");
const DeviceToken = require("../models/DeviceToken");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendPromotionalBroadcast } = require("../services/notificationService");
const router = express.Router();

router.use(authMiddleware);

// Notification Center — paginated list, newest first
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
    const filter = { userId: req.userId };
    if (req.query.unreadOnly === "true") filter.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.userId, isRead: false }),
    ]);

    res.status(200).json({ data, unreadCount, pagination: { page, pageSize, total } });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true, readAt: new Date(), status: "READ" },
      { new: true }
    );
    if (!notif) throw ApiError.notFound("Notification not found");
    res.status(200).json(notif);
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true, readAt: new Date(), status: "READ" }
    );
    res.status(200).json({ message: "All notifications marked as read" });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) throw ApiError.notFound("Notification not found");
    res.status(200).json({ message: "Notification deleted" });
  })
);

// Preferences
router.get(
  "/preferences",
  asyncHandler(async (req, res) => {
    const pref = await NotificationPreference.findOneAndUpdate(
      { userId: req.userId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(pref);
  })
);

router.put(
  "/preferences",
  asyncHandler(async (req, res) => {
    const allowedFields = [
      "orderConfirmation", "paymentUpdates", "shippingUpdates", "deliveryStatus",
      "wishlistPriceDrop", "backInStock", "promotional", "abandonedCart",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (typeof req.body[field] === "boolean") updates[field] = req.body[field];
    }
    const pref = await NotificationPreference.findOneAndUpdate(
      { userId: req.userId },
      updates,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(pref);
  })
);

// Theme (Task 4 scope: light/dark/system personalization)
router.get(
  "/theme",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select("theme");
    res.status(200).json({ theme: user.theme });
  })
);

router.put(
  "/theme",
  asyncHandler(async (req, res) => {
    const { theme } = req.body;
    if (!["light", "dark", "system"].includes(theme)) {
      throw ApiError.badRequest("theme must be one of: light, dark, system");
    }
    const user = await User.findByIdAndUpdate(req.userId, { theme }, { new: true }).select("theme");
    res.status(200).json({ theme: user.theme });
  })
);

// Web Push — this app's real push channel (Task 4's "Expo Notifications"
// requirement doesn't fit a React-web stack; Web Push is the web
// equivalent — same role: device token registration + push delivery).
router.get(
  "/push/public-key",
  asyncHandler(async (req, res) => {
    res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
  })
);

router.post(
  "/push/subscribe",
  asyncHandler(async (req, res) => {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw ApiError.badRequest("endpoint and keys.p256dh/keys.auth are required");
    }
    const token = await DeviceToken.findOneAndUpdate(
      { endpoint },
      { userId: req.userId, keys, userAgent, lastSeenAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ registered: true, id: token._id });
  })
);

router.delete(
  "/push/subscribe",
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) throw ApiError.badRequest("endpoint is required");
    await DeviceToken.deleteOne({ endpoint, userId: req.userId });
    res.status(200).json({ removed: true });
  })
);

// Promotional broadcast — only trigger point for the PROMOTIONAL category
// since there's no admin/marketing panel in this codebase. Same caveat as
// the order fulfillment routes: no role gate exists yet, so this is
// reachable by any authenticated user. In production this needs to be
// restricted to staff/marketing.
router.post(
  "/broadcast",
  asyncHandler(async (req, res) => {
    const { title, message, data } = req.body;
    if (!title || !message) throw ApiError.badRequest("title and message are required");
    const result = await sendPromotionalBroadcast({ title, message, data });
    res.status(200).json(result);
  })
);

module.exports = router;
