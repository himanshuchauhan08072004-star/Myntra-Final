const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { ApiError } = require("../utils/ApiError");

// Recomputes Product.rating/reviewCount from actual review data — called
// after any create/update/delete so the two never drift out of sync.
async function syncProductRatingAggregate(productId) {
  const [agg] = await Review.aggregate([
    { $match: { productId } },
    { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    rating: agg ? Math.round(agg.avgRating * 10) / 10 : 0,
    reviewCount: agg ? agg.count : 0,
  });
}

// A purchase counts as "verified" once its order has moved past pending
// (i.e. payment confirmed) — matches Task6's order.status lifecycle.
async function isVerifiedPurchase(userId, productId) {
  const order = await Order.findOne({
    userId,
    "items.productId": productId,
    status: { $in: ["processing", "shipped", "delivered"] },
  });
  return !!order;
}

const reviewService = {
  async create(userId, productId, { rating, title, comment }) {
    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound("Product not found");

    const existing = await Review.findOne({ userId, productId });
    if (existing) throw ApiError.conflict("You already reviewed this product — edit your existing review instead");

    const verifiedPurchase = await isVerifiedPurchase(userId, productId);
    const review = await new Review({ userId, productId, rating, title, comment, verifiedPurchase }).save();
    await syncProductRatingAggregate(productId);
    return review;
  },

  async update(userId, reviewId, { rating, title, comment }) {
    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) throw ApiError.notFound("Review not found");

    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    await review.save();
    await syncProductRatingAggregate(review.productId);
    return review;
  },

  async remove(userId, reviewId) {
    const review = await Review.findOneAndDelete({ _id: reviewId, userId });
    if (!review) throw ApiError.notFound("Review not found");
    await syncProductRatingAggregate(review.productId);
  },

  async listForProduct(productId, { page = 1, pageSize = 10, sort = "newest" } = {}) {
    const sortMap = {
      newest: { createdAt: -1 },
      helpful: { helpfulVotes: -1, createdAt: -1 },
      highest: { rating: -1, createdAt: -1 },
      lowest: { rating: 1, createdAt: -1 },
    };
    const [data, total] = await Promise.all([
      Review.find({ productId })
        .sort(sortMap[sort] || sortMap.newest)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("userId", "fullName"),
      Review.countDocuments({ productId }),
    ]);
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  async markHelpful(userId, reviewId) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound("Review not found");
    if (review.helpfulVoterIds.some((id) => id.equals(userId))) {
      throw ApiError.conflict("You already marked this review as helpful");
    }
    review.helpfulVoterIds.push(userId);
    review.helpfulVotes += 1;
    await review.save();
    return review;
  },
};

module.exports = { reviewService };
