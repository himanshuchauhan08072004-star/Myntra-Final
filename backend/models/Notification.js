const mongoose = require("mongoose");

const NOTIFICATION_CATEGORIES = [
  "ORDER_CONFIRMATION",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "SHIPPING_UPDATE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "ORDER_CANCELLED",
  "ORDER_RETURNED",
  "WISHLIST_PRICE_DROP",
  "BACK_IN_STOCK",
  "PROMOTIONAL",
  "ABANDONED_CART",
  "SYSTEM",
];

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, enum: NOTIFICATION_CATEGORIES },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "DELIVERED", "FAILED", "READ"],
      default: "PENDING",
    },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
module.exports.NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORIES;
