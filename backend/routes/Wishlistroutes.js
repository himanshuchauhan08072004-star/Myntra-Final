const express = require("express");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) throw ApiError.badRequest("productId is required");
    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound("Product not found");
    // upsert avoids the duplicate-key error the old code would throw on double-add
    const item = await Wishlist.findOneAndUpdate(
      { userId: req.userId, productId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(item);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await Wishlist.find({ userId: req.userId }).populate("productId");
    // Same class of bug as the bag: a product reseed leaves stale entries
    // pointing at a deleted productId. Clean them up for real instead of
    // just hiding them, so they can't cause confusing failures later.
    const orphaned = items.filter((item) => !item.productId);
    if (orphaned.length > 0) {
      await Wishlist.deleteMany({ _id: { $in: orphaned.map((o) => o._id) } });
    }
    res.status(200).json(items.filter((item) => item.productId));
  })
);

router.delete(
  "/:itemid",
  asyncHandler(async (req, res) => {
    const deleted = await Wishlist.findOneAndDelete({ _id: req.params.itemid, userId: req.userId });
    if (!deleted) throw ApiError.notFound("Item not found in wishlist");
    res.status(200).json({ message: "Item removed from Wishlist" });
  })
);

module.exports = router;
