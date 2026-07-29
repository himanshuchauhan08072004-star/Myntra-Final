const mongoose = require("mongoose");

const PaymentEventSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "stripe" },
    providerEventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("PaymentEvent", PaymentEventSchema);
