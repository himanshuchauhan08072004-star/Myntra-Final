const express = require("express");
const RecentlyViewed = require("../models/RecentlyViewed");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { emitToUser } = require("../sockets");
const router = express.Router();

// Two different caps on purpose:
// - STORAGE_LIMIT (50): how much browsing history we keep at all, per Task 3
//   spec ("latest 50 unique products") — this is the signal recommendations
//   read from.
// - DISPLAY_LIMIT (20): how much of that history the Recently Viewed /
//   Continue Shopping UI actually shows, per Task 1 spec ("latest 20 unique
//   viewed products"). Same underlying collection, two read-time limits.
const STORAGE_LIMIT = 50;
const DISPLAY_LIMIT = 20;

router.use(authMiddleware);

async function latestForUser(userId, limit = DISPLAY_LIMIT) {
  const rows = await RecentlyViewed.find({ userId })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .populate("productId");

  // populate() returns null in place of productId when the referenced
  // product no longer exists (e.g. the DB was reseeded, which deletes and
  // recreates every product with a new _id). Without this filter, every
  // consumer of latestForUser crashes on `.productId._id` / `.productId.name`.
  const orphaned = rows.filter((r) => !r.productId);
  if (orphaned.length > 0) {
    await RecentlyViewed.deleteMany({ _id: { $in: orphaned.map((r) => r._id) } });
  }
  return rows.filter((r) => r.productId);
}

// Record a product view — upserts (dedupe by productId), trims to
// STORAGE_LIMIT (the full browsing-history retention), pushes real-time
// update (display-limited) to all of the user's connected devices.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) throw ApiError.badRequest("productId is required");

    const exists = await Product.exists({ _id: productId });
    if (!exists) throw ApiError.notFound("Product no longer exists");

    await RecentlyViewed.findOneAndUpdate(
      { userId: req.userId, productId },
      { viewedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Trim beyond STORAGE_LIMIT (oldest first)
    const all = await RecentlyViewed.find({ userId: req.userId }).sort({ viewedAt: -1 });
    if (all.length > STORAGE_LIMIT) {
      const toRemove = all.slice(STORAGE_LIMIT).map((d) => d._id);
      await RecentlyViewed.deleteMany({ _id: { $in: toRemove } });
    }

    const updated = await latestForUser(req.userId);
    emitToUser(req.userId, "recently-viewed:updated", updated);
    res.status(201).json(updated);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await latestForUser(req.userId);
    res.status(200).json(items);
  })
);

router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const deleted = await RecentlyViewed.findOneAndDelete({
      userId: req.userId,
      productId: req.params.productId,
    });
    if (!deleted) throw ApiError.notFound("Item not found in history");
    const updated = await latestForUser(req.userId);
    emitToUser(req.userId, "recently-viewed:updated", updated);
    res.status(200).json({ message: "Removed from history" });
  })
);

// Guest-to-user merge on login. Body: { items: [{ productId, viewedAt }] }
// Keeps newest viewedAt per productId between guest payload and existing server record.
router.post(
  "/merge-guest",
  asyncHandler(async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) throw ApiError.badRequest("items must be an array");

    const deduped = new Map();
    for (const item of items) {
      const viewedAt = new Date(item.viewedAt);
      const current = deduped.get(item.productId);
      if (!current || viewedAt > current) deduped.set(item.productId, viewedAt);
    }

    for (const [productId, viewedAt] of deduped.entries()) {
      const existing = await RecentlyViewed.findOne({ userId: req.userId, productId });
      if (!existing || viewedAt > existing.viewedAt) {
        await RecentlyViewed.findOneAndUpdate(
          { userId: req.userId, productId },
          { viewedAt },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }

    const all = await RecentlyViewed.find({ userId: req.userId }).sort({ viewedAt: -1 });
    if (all.length > STORAGE_LIMIT) {
      const toRemove = all.slice(STORAGE_LIMIT).map((d) => d._id);
      await RecentlyViewed.deleteMany({ _id: { $in: toRemove } });
    }

    const merged = await latestForUser(req.userId);
    emitToUser(req.userId, "recently-viewed:updated", merged);
    res.status(200).json(merged);
  })
);

// Continue Shopping = recently viewed products not yet purchased.
// NOTE: base Order model has no reliable "completed" status transition yet
// (Task 6 module will add real lifecycle) — for now, ANY existing order
// containing the product counts as "purchased", regardless of status.
router.get(
  "/continue-shopping",
  asyncHandler(async (req, res) => {
    const viewed = await latestForUser(req.userId);
    const orders = await Order.find({ userId: req.userId }).select("items.productId");
    const purchasedIds = new Set(
      orders.flatMap((o) => o.items.map((i) => i.productId.toString()))
    );
    const result = viewed.filter((v) => !purchasedIds.has(v.productId._id.toString()));
    res.status(200).json(result);
  })
);

module.exports = router;
