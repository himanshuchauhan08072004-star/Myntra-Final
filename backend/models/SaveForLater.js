const mongoose = require("mongoose");

const SaveForLaterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    size: String,
    color: String,
    quantity: Number,
    priceCentsAtAdd: { type: Number, default: null },
  },
  { timestamps: true }
);

SaveForLaterSchema.index({ userId: 1, productId: 1, size: 1, color: 1 }, { unique: true });

module.exports = mongoose.model("SaveForLater", SaveForLaterSchema);
