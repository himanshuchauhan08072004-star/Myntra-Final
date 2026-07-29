const Product = require("../models/Product");
const RecentlyViewed = require("../models/RecentlyViewed");
const Wishlist = require("../models/Wishlist");
const Order = require("../models/Order");

const WEIGHTS = { history: 3, wishlist: 4, trending: 1 };
// "Recently purchased" exclusion window — orders older than this no longer
// suppress a product from recommendations (someone who bought socks 8
// months ago is a fine candidate to see socks again).
const RECENT_PURCHASE_DAYS = 90;

const recommendationService = {
  // Trending = highest rating * reviewCount, proxy for popularity since we
  // don't have a dedicated view-count/purchase-count aggregate yet.
  // Filtering (stock) and sorting (rating/reviewCount) both happen in the
  // query itself — uses the {stock:1} and {rating:-1, reviewCount:-1}
  // indexes on Product instead of loading the whole catalog and sorting
  // in JS.
  async getTrending(limit = 10, excludeIds = []) {
    const filter = { stock: { $gt: 0 } };
    if (excludeIds.length) filter._id = { $nin: excludeIds };

    const products = await Product.find(filter)
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .lean();

    return products.map((p) => ({ ...p, reason: "Trending now" }));
  },

  async getForUser(userId, limit = 10) {
    const purchaseCutoff = new Date(Date.now() - RECENT_PURCHASE_DAYS * 24 * 60 * 60 * 1000);

    const [history, wishlist, recentOrders] = await Promise.all([
      // Only need category + id for scoring — populate() with a field
      // projection instead of pulling the full product doc per row.
      RecentlyViewed.find({ userId }).populate("productId", "category").lean(),
      Wishlist.find({ userId }).populate("productId", "category").lean(),
      Order.find({ userId, placedAt: { $gte: purchaseCutoff } }).select("items.productId").lean(),
    ]);

    // Build category affinity from history + wishlist
    const categoryScore = {};
    const excludeIds = new Set();

    for (const h of history) {
      if (!h.productId) continue;
      excludeIds.add(String(h.productId._id));
      categoryScore[h.productId.category] =
        (categoryScore[h.productId.category] || 0) + WEIGHTS.history;
    }
    for (const w of wishlist) {
      if (!w.productId) continue;
      excludeIds.add(String(w.productId._id));
      categoryScore[w.productId.category] =
        (categoryScore[w.productId.category] || 0) + WEIGHTS.wishlist;
    }
    // Exclude anything bought in the last RECENT_PURCHASE_DAYS, regardless
    // of whether it also shows up in history/wishlist.
    for (const order of recentOrders) {
      for (const item of order.items) {
        excludeIds.add(String(item.productId));
      }
    }

    if (Object.keys(categoryScore).length === 0) {
      // Cold start — no signal yet, fall back to trending (still excludes
      // recently purchased items).
      return this.getTrending(limit, [...excludeIds]);
    }

    // Stock + category + exclusion filtering happens in the query (uses the
    // {category:1, stock:1} index), and we only pull a bounded candidate
    // pool (limit * 5) instead of every matching product — affinity scoring
    // then runs in JS on that small pool, not the full catalog.
    const candidates = await Product.find({
      category: { $in: Object.keys(categoryScore) },
      _id: { $nin: [...excludeIds] },
      stock: { $gt: 0 },
    })
      .sort({ rating: -1 })
      .limit(limit * 5)
      .lean();

    return candidates
      .map((p) => {
        const affinityScore = categoryScore[p.category] || 0;
        const trendingScore = (p.rating || 0) * WEIGHTS.trending;
        return {
          ...p,
          score: affinityScore + trendingScore,
          reason: affinityScore >= WEIGHTS.wishlist ? "Because you wishlisted similar items" : "Based on your browsing",
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
};

module.exports = { recommendationService };
