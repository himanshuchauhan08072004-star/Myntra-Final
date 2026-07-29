const express = require("express");
const { optionalAuth } = require("../middlewares/auth.middleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { recommendationService } = require("../services/recommendationService");
const router = express.Router();

// Guests get trending; logged-in users get personalized recs — same endpoint.
router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const items = req.userId
      ? await recommendationService.getForUser(req.userId)
      : await recommendationService.getTrending();
    res.status(200).json(items);
  })
);

router.get(
  "/trending",
  asyncHandler(async (req, res) => {
    const items = await recommendationService.getTrending();
    res.status(200).json(items);
  })
);

module.exports = router;
