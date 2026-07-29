const express = require("express");
const { authMiddleware, optionalAuth } = require("../middlewares/auth.middleware");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { reviewService } = require("../services/reviewService");
const router = express.Router();

// Public — anyone can read reviews for a product
router.get(
  "/product/:productId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, sort } = req.query;
    const result = await reviewService.listForProduct(req.params.productId, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      sort,
    });
    res.status(200).json(result);
  })
);

router.use(authMiddleware);

router.post(
  "/product/:productId",
  asyncHandler(async (req, res) => {
    const { rating, title, comment } = req.body;
    if (!rating) throw ApiError.badRequest("rating is required");
    const review = await reviewService.create(req.userId, req.params.productId, { rating, title, comment });
    res.status(201).json(review);
  })
);

router.patch(
  "/:reviewId",
  asyncHandler(async (req, res) => {
    const review = await reviewService.update(req.userId, req.params.reviewId, req.body);
    res.status(200).json(review);
  })
);

router.delete(
  "/:reviewId",
  asyncHandler(async (req, res) => {
    await reviewService.remove(req.userId, req.params.reviewId);
    res.status(200).json({ message: "Review deleted" });
  })
);

router.post(
  "/:reviewId/helpful",
  asyncHandler(async (req, res) => {
    const review = await reviewService.markHelpful(req.userId, req.params.reviewId);
    res.status(200).json(review);
  })
);

module.exports = router;
