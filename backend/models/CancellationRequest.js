const mongoose = require("mongoose");

const CancellationRequestSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    type: { type: String, enum: ["cancellation", "return"], required: true },
    reason: String,
    status: { type: String, enum: ["requested", "approved", "rejected"], default: "requested" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CancellationRequest", CancellationRequestSchema);
