const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    provider: { type: String, default: "stripe" },
    providerIntentId: { type: String, required: true, unique: true },
    amountCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ["requires_action", "succeeded", "failed", "refunded"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
