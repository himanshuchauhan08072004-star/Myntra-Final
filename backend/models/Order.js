const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "pending", "processing", "shipped", "delivered", "cancelled", "returned", "refunded",
];

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: String,
    productImage: String,
    size: String,
    color: String,
    unitPriceCents: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: String,
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    paymentMethod: { type: String, required: true },
    currency: { type: String, default: "INR" },
    subtotalCents: { type: Number, required: true },
    taxCents: { type: Number, default: 0 },
    shippingCents: { type: Number, default: 0 },
    totalCents: { type: Number, required: true },
    shippingAddress: { type: String, required: true },
    items: [OrderItemSchema],
    statusHistory: [StatusHistorySchema],
    tracking: {
      number: String,
      carrier: String,
      estimatedDelivery: Date,
      currentLocation: String,
    },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ userId: 1, placedAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.CANCELLABLE_STATUSES = ["pending", "processing"];
module.exports.RETURNABLE_STATUSES = ["delivered"];
