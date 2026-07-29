const express = require("express");
const mongoose = require("mongoose");
const Bag = require("../models/Bag");
const SaveForLater = require("../models/SaveForLater");
const Product = require("../models/Product");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { emitToUser } = require("../sockets");
const router = express.Router();

router.use(authMiddleware);

// Add to bag — increments quantity if same product+size already in bag,
// checks stock before adding either way.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId, size, color = null, quantity = 1 } = req.body;
    if (!productId || !size) {
      throw ApiError.badRequest("productId and size are required");
    }
    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound("Product not found");

    const existing = await Bag.findOne({ userId: req.userId, productId, size, color });
    const desiredQty = (existing?.quantity || 0) + quantity;

    if (product.stock < desiredQty) {
      throw ApiError.badRequest(
        `Only ${product.stock} in stock, cannot add ${desiredQty}`
      );
    }

    let bagItem;
    if (existing) {
      // Snapshot deliberately not touched here — it should keep reflecting
      // the price at first-add so a later price change is still detectable,
      // not reset every time the same line is re-added.
      existing.quantity = desiredQty;
      bagItem = await existing.save();
    } else {
      bagItem = await new Bag({
        userId: req.userId,
        productId,
        size,
        color,
        quantity,
        priceCentsAtAdd: Math.round(product.price * 100),
      }).save();
    }
    emitToUser(req.userId, "cart:update", { reason: "add" });
    res.status(200).json(bagItem);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const bag = await Bag.find({ userId: req.userId }).populate("productId");
    // A reseed deletes and recreates all products with new _ids — any bag
    // item added before that now populates to null and would crash the
    // frontend on item.productId.name. Drop those orphaned rows for real
    // (not just from the response) so they don't linger and later trip up
    // checkout validation, which reads the same collection.
    const orphaned = bag.filter((item) => !item.productId);
    if (orphaned.length > 0) {
      await Bag.deleteMany({ _id: { $in: orphaned.map((o) => o._id) } });
    }

    // Price-change detection: compare the price snapshot taken at add-time
    // against the product's current live price. Totals are always computed
    // from the live price (never the snapshot), so they're already correct —
    // this just tells the frontend when to show a "price changed" notice.
    const result = bag
      .filter((item) => item.productId)
      .map((item) => {
        const plain = item.toObject();
        const currentPriceCents = Math.round(item.productId.price * 100);
        const priceChanged =
          plain.priceCentsAtAdd != null && plain.priceCentsAtAdd !== currentPriceCents;
        return {
          ...plain,
          priceChanged,
          priceCentsAtAdd: plain.priceCentsAtAdd,
          currentPriceCents,
        };
      });

    res.status(200).json(result);
  })
);

router.patch(
  "/:itemid",
  asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      throw ApiError.badRequest("quantity must be at least 1");
    }
    const item = await Bag.findOne({ _id: req.params.itemid, userId: req.userId }).populate("productId");
    if (!item) throw ApiError.notFound("Bag item not found");
    if (!item.productId) throw ApiError.notFound("This product is no longer available — remove it from your bag");
    if (item.productId.stock < quantity) {
      throw ApiError.badRequest(`Only ${item.productId.stock} in stock`);
    }
    item.quantity = quantity;
    await item.save();
    emitToUser(req.userId, "cart:update", { reason: "quantity" });
    res.status(200).json(item);
  })
);

router.delete(
  "/:itemid",
  asyncHandler(async (req, res) => {
    const deleted = await Bag.findOneAndDelete({ _id: req.params.itemid, userId: req.userId });
    if (!deleted) throw ApiError.notFound("Bag item not found");
    emitToUser(req.userId, "cart:update", { reason: "remove" });
    res.status(200).json({ message: "Item removed from bag" });
  })
);

// Save For Later (Task 2)
router.get(
  "/save-for-later/list",
  asyncHandler(async (req, res) => {
    const saved = await SaveForLater.find({ userId: req.userId }).populate("productId");
    res.status(200).json(saved.filter((item) => item.productId));
  })
);

router.post(
  "/save-for-later/:bagItemId",
  asyncHandler(async (req, res) => {
    const bagItem = await Bag.findOne({ _id: req.params.bagItemId, userId: req.userId });
    if (!bagItem) throw ApiError.notFound("Bag item not found");

    // Two writes (upsert SaveForLater + delete Bag) must succeed or fail
    // together — otherwise a crash mid-way can leave the item in both
    // collections or neither.
    const session = await mongoose.startSession();
    let saved;
    try {
      await session.withTransaction(async () => {
        const existing = await SaveForLater.findOne({
          userId: req.userId,
          productId: bagItem.productId,
          size: bagItem.size,
          color: bagItem.color || null,
        }).session(session);

        saved = await SaveForLater.findOneAndUpdate(
          { userId: req.userId, productId: bagItem.productId, size: bagItem.size, color: bagItem.color || null },
          {
            $inc: { quantity: bagItem.quantity },
            // Keep the earliest snapshot if one already exists there, else
            // carry over the bag item's snapshot.
            $setOnInsert: existing ? {} : { priceCentsAtAdd: bagItem.priceCentsAtAdd },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );
        await bagItem.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }

    emitToUser(req.userId, "cart:update", { reason: "save-for-later" });
    res.status(200).json(saved);
  })
);

router.post(
  "/save-for-later/:savedItemId/move-to-bag",
  asyncHandler(async (req, res) => {
    const saved = await SaveForLater.findOne({ _id: req.params.savedItemId, userId: req.userId }).populate("productId");
    if (!saved) throw ApiError.notFound("Saved item not found");
    if (!saved.productId) throw ApiError.notFound("This product is no longer available — remove it from Saved for Later");
    if (saved.productId.stock < saved.quantity) {
      throw ApiError.badRequest(`Only ${saved.productId.stock} in stock`);
    }

    const session = await mongoose.startSession();
    let bagItem;
    try {
      await session.withTransaction(async () => {
        const existing = await Bag.findOne({
          userId: req.userId,
          productId: saved.productId._id,
          size: saved.size,
          color: saved.color || null,
        }).session(session);

        bagItem = await Bag.findOneAndUpdate(
          { userId: req.userId, productId: saved.productId._id, size: saved.size, color: saved.color || null },
          {
            $inc: { quantity: saved.quantity },
            $setOnInsert: existing ? {} : { priceCentsAtAdd: saved.priceCentsAtAdd },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );
        await saved.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }

    emitToUser(req.userId, "cart:update", { reason: "move-to-bag" });
    res.status(200).json(bagItem);
  })
);

module.exports = router;
