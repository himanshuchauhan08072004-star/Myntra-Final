const mongoose = require("mongoose");

const RecentlyViewedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    viewedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

RecentlyViewedSchema.index({ userId: 1, productId: 1 }, { unique: true });
RecentlyViewedSchema.index({ userId: 1, viewedAt: -1 });

module.exports = mongoose.model("RecentlyViewed", RecentlyViewedSchema);
