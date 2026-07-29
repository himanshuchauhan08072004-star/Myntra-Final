const mongoose = require("mongoose");

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    orderConfirmation: { type: Boolean, default: true },
    paymentUpdates: { type: Boolean, default: true },
    shippingUpdates: { type: Boolean, default: true },
    deliveryStatus: { type: Boolean, default: true },
    wishlistPriceDrop: { type: Boolean, default: true },
    backInStock: { type: Boolean, default: true },
    promotional: { type: Boolean, default: true },
    abandonedCart: { type: Boolean, default: true },
    system: { type: Boolean, default: true }, // not user-disableable in UI, recommend
  },
  { timestamps: true }
);

const CATEGORY_TO_PREF_FIELD = {
  ORDER_CONFIRMATION: "orderConfirmation",
  PAYMENT_SUCCESS: "paymentUpdates",
  PAYMENT_FAILED: "paymentUpdates",
  SHIPPING_UPDATE: "shippingUpdates",
  OUT_FOR_DELIVERY: "deliveryStatus",
  DELIVERED: "deliveryStatus",
  ORDER_CANCELLED: "shippingUpdates",
  ORDER_RETURNED: "shippingUpdates",
  WISHLIST_PRICE_DROP: "wishlistPriceDrop",
  BACK_IN_STOCK: "backInStock",
  PROMOTIONAL: "promotional",
  ABANDONED_CART: "abandonedCart",
  SYSTEM: "system",
};

module.exports = mongoose.model("NotificationPreference", NotificationPreferenceSchema);
module.exports.CATEGORY_TO_PREF_FIELD = CATEGORY_TO_PREF_FIELD;
