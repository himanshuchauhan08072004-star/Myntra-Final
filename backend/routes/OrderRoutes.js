const express = require("express");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { orderService } = require("../services/orderService");
const { streamInvoicePdf } = require("../utils/invoicePdf");
const router = express.Router();

router.use(authMiddleware);

// Checkout: creates pending order + Stripe PaymentIntent, returns clientSecret
// for frontend to confirm payment. Stock decrements + bag clears only happen
// once Stripe confirms via webhook (see routes/WebhookRoutes.js).
router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const result = await orderService.createFromBag(req.userId, req.body);
    res.status(201).json(result);
  })
);

router.get(
  "/user/:userid",
  asyncHandler(async (req, res) => {
    if (req.params.userid !== String(req.userId)) {
      throw ApiError.forbidden("Cannot view another user's orders");
    }
    const result = await orderService.listOrders(req.userId, req.query);
    res.status(200).json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await orderService.getOrderDetail(req.userId, req.params.id);
    if (!result) throw ApiError.notFound("Order not found");
    res.status(200).json(result);
  })
);

router.get(
  "/:id/invoice.pdf",
  asyncHandler(async (req, res) => {
    const result = await orderService.getOrderDetail(req.userId, req.params.id);
    if (!result) throw ApiError.notFound("Order not found");
    streamInvoicePdf(res, { order: result.order });
  })
);

router.post(
  "/:id/reorder",
  asyncHandler(async (req, res) => {
    const result = await orderService.reorder(req.userId, req.params.id);
    if (result.error === "not_found") throw ApiError.notFound("Order not found");
    if (result.error === "no_items") throw ApiError.badRequest("Original order has no items");
    if (result.error === "out_of_stock") {
      throw ApiError.badRequest(`${result.productName} is out of stock`);
    }
    res.status(201).json(result.order);
  })
);

router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const result = await orderService.requestCancellationOrReturn(
      req.userId, req.params.id, "cancellation", req.body.reason
    );
    if (result.error === "not_found") throw ApiError.notFound("Order not found");
    if (result.error === "not_eligible") {
      throw ApiError.conflict(`Order cannot be cancelled from status "${result.currentStatus}"`);
    }
    res.status(201).json(result.request);
  })
);

router.post(
  "/:id/return",
  asyncHandler(async (req, res) => {
    const result = await orderService.requestCancellationOrReturn(
      req.userId, req.params.id, "return", req.body.reason
    );
    if (result.error === "not_found") throw ApiError.notFound("Order not found");
    if (result.error === "not_eligible") {
      throw ApiError.conflict(`Order cannot be returned from status "${result.currentStatus}"`);
    }
    res.status(201).json(result.request);
  })
);

// Fulfillment progression — ship / out_for_delivery / deliver. See the
// NOTE on orderService.advanceStatus: no admin/role gate exists in this
// codebase yet, so this is reachable by any authenticated user, not just
// staff. Needed for the SHIPPING_UPDATE/OUT_FOR_DELIVERY/DELIVERED
// notification categories to ever actually fire.
router.post(
  "/:id/advance-status",
  asyncHandler(async (req, res) => {
    const { action, tracking } = req.body;
    const result = await orderService.advanceStatus(req.params.id, action, tracking);
    if (result.error === "not_found") throw ApiError.notFound("Order not found");
    if (result.error === "invalid_action") {
      throw ApiError.badRequest("action must be one of: ship, out_for_delivery, deliver");
    }
    if (result.error === "not_eligible") {
      throw ApiError.conflict(`Cannot apply "${action}" from status "${result.currentStatus}"`);
    }
    res.status(200).json(result.order);
  })
);

module.exports = router;
