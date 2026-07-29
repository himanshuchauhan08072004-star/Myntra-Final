const Notification = require("../models/Notification");
const NotificationPreference = require("../models/NotificationPreference");
const Wishlist = require("../models/Wishlist");
const Bag = require("../models/Bag");
const User = require("../models/User");
const { emitToUser } = require("../sockets");
const { sendPushToUser } = require("./pushService");

const { CATEGORY_TO_PREF_FIELD } = NotificationPreference;

// Shared trigger — call this from order/payment/shipping/wishlist/stock/cart
// modules, e.g. dispatchNotification({ userId, category: 'ORDER_CONFIRMATION', ... })
//
// Delivers on two channels: Socket.io (in-app notification center, real-time
// while the tab is open) and Web Push (works even when the tab/browser is
// closed — the actual "push notification" requirement). Both respect the
// same per-category preference check.
async function dispatchNotification({ userId, category, title, message, data = {} }) {
  const pref = await NotificationPreference.findOne({ userId });
  const prefField = CATEGORY_TO_PREF_FIELD[category];

  if (pref && prefField && pref[prefField] === false) {
    return { skipped: true, reason: "User disabled this category" };
  }

  const notification = await Notification.create({
    userId,
    category,
    title,
    message,
    data,
    status: "DELIVERED",
  });

  emitToUser(userId, "notification:new", {
    id: notification._id,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    createdAt: notification.createdAt,
  });

  // Push failures never fail the notification itself — it's already
  // recorded and delivered in-app; push is a best-effort extra channel.
  try {
    const { sent } = await sendPushToUser(userId, {
      title: notification.title,
      body: notification.message,
      data: { category: notification.category, ...notification.data },
    });
    if (sent === 0) {
      // No registered device, or push not configured — still counts as
      // delivered via the in-app channel, so leave status as DELIVERED.
    }
  } catch (err) {
    await Notification.updateOne({ _id: notification._id }, { status: "FAILED" });
    console.error(`[notifications] push delivery failed for ${notification._id}:`, err.message);
  }

  return { skipped: false, notification };
}

// Call whenever a product's stock moves from 0 to >0 (restock, cancellation,
// admin update). Notifies everyone who has it wishlisted.
async function notifyBackInStock(product) {
  const wishlisters = await Wishlist.find({ productId: product._id }).select("userId").lean();
  for (const w of wishlisters) {
    await dispatchNotification({
      userId: w.userId,
      category: "BACK_IN_STOCK",
      title: "Back in stock",
      message: `${product.name} is back in stock.`,
      data: { productId: product._id },
    });
  }
}

// Call whenever a product's price is lowered. Notifies everyone who has it
// wishlisted, with the old and new price.
async function notifyPriceDrop(product, oldPriceCents) {
  const wishlisters = await Wishlist.find({ productId: product._id }).select("userId").lean();
  const newPrice = product.price;
  const oldPrice = (oldPriceCents / 100).toFixed(2);
  for (const w of wishlisters) {
    await dispatchNotification({
      userId: w.userId,
      category: "WISHLIST_PRICE_DROP",
      title: "Price drop on your wishlist",
      message: `${product.name} dropped from ₹${oldPrice} to ₹${newPrice.toFixed(2)}.`,
      data: { productId: product._id },
    });
  }
}

const ABANDONED_CART_IDLE_HOURS = 24;
const ABANDONED_CART_COOLDOWN_HOURS = 24;

// Scheduled job (see server.js) — finds users whose bag hasn't changed in
// ABANDONED_CART_IDLE_HOURS and haven't already gotten an abandoned-cart
// notification in the last cooldown window, and nudges them.
async function runAbandonedCartCheck() {
  const idleCutoff = new Date(Date.now() - ABANDONED_CART_IDLE_HOURS * 60 * 60 * 1000);
  const cooldownCutoff = new Date(Date.now() - ABANDONED_CART_COOLDOWN_HOURS * 60 * 60 * 1000);

  const staleUserIds = await Bag.distinct("userId", { updatedAt: { $lte: idleCutoff } });
  let notified = 0;

  for (const userId of staleUserIds) {
    const alreadyNotified = await Notification.exists({
      userId,
      category: "ABANDONED_CART",
      createdAt: { $gte: cooldownCutoff },
    });
    if (alreadyNotified) continue;

    const itemCount = await Bag.countDocuments({ userId });
    if (itemCount === 0) continue;

    const result = await dispatchNotification({
      userId,
      category: "ABANDONED_CART",
      title: "You left something in your bag",
      message:
        itemCount === 1
          ? "You have 1 item waiting in your bag — come back and grab it before it sells out."
          : `You have ${itemCount} items waiting in your bag — come back and grab them before they sell out.`,
      data: {},
    });
    if (!result.skipped) notified += 1;
  }

  return { checked: staleUserIds.length, notified };
}

// Sends a PROMOTIONAL notification to every user (respects each user's own
// promotional preference toggle, same as any other category). This is the
// only trigger point for the PROMOTIONAL category — there's no
// admin/marketing UI in this codebase, so it's exposed as an endpoint in
// NotificationRoutes.js for now rather than firing autonomously.
async function sendPromotionalBroadcast({ title, message, data = {} }) {
  const userIds = await User.distinct("_id");
  let sent = 0;
  for (const userId of userIds) {
    const result = await dispatchNotification({ userId, category: "PROMOTIONAL", title, message, data });
    if (!result.skipped) sent += 1;
  }
  return { totalUsers: userIds.length, sent };
}

module.exports = {
  dispatchNotification,
  notifyBackInStock,
  notifyPriceDrop,
  runAbandonedCartCheck,
  sendPromotionalBroadcast,
};
