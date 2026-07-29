const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 2000 },
    verifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
    helpfulVoterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// One review per user per product — resubmission edits the existing review.
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", ReviewSchema);
