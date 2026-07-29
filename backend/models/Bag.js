const mongoose = require("mongoose");

const BagItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    size: String,
    color: String,
    quantity: Number,
    // Snapshot of the product's price (in cents) at the moment this item
    // was added/last quantity-changed. Compared against the live product
    // price on read so price changes since add-time can be detected and
    // surfaced to the user instead of silently recalculating totals.
    priceCentsAtAdd: { type: Number, default: null },
  },
  { timestamps: true }
);

BagItemSchema.index({ userId: 1, productId: 1, size: 1, color: 1 }, { unique: true });

module.exports = mongoose.model("Bag", BagItemSchema);
