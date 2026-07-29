const mongoose = require("mongoose");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const CancellationRequest = require("../models/CancellationRequest");
const Bag = require("../models/Bag");
const Product = require("../models/Product");
const Wishlist = require("../models/Wishlist");
const { ApiError } = require("../utils/ApiError");
const { createPaymentIntent } = require("./stripeService");
const { emitToUser } = require("../sockets");
const { dispatchNotification, notifyBackInStock } = require("./notificationService");

const { CANCELLABLE_STATUSES, RETURNABLE_STATUSES } = Order;

function generateInvoiceNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

const orderService = {
  // Checkout: validate stock, create pending order, create Stripe PaymentIntent.
  // Stock is NOT decremented here — only on confirmed payment (webhook), so an
  // abandoned checkout never leaves stock incorrectly reserved.
  async createFromBag(userId, { shippingAddress, paymentMethod, currency = "INR" }) {
    if (!shippingAddress || !paymentMethod) {
      throw ApiError.badRequest("shippingAddress and paymentMethod are required");
    }
    const rawBag = await Bag.find({ userId }).populate("productId");
    if (rawBag.length === 0) throw ApiError.badRequest("No item in the bag");

    // A product reseed (or deletion) leaves old Bag rows pointing at a
    // productId that no longer exists — populate() resolves those to null.
    // GET /bag already hides these from the cart UI, so silently hard-blocking
    // checkout here (instead of cleaning them up the same way) is what caused
    // checkout to fail even though the visible bag looked completely valid.
    // Delete the stale rows for real and proceed with whatever's left.
    const orphaned = rawBag.filter((item) => !item.productId);
    if (orphaned.length > 0) {
      console.warn(
        `[checkout] removing ${orphaned.length} stale bag item(s) for user ${userId}: ` +
          orphaned.map((o) => o._id).join(", ")
      );
      await Bag.deleteMany({ _id: { $in: orphaned.map((o) => o._id) } });
    }

    const bag = rawBag.filter((item) => item.productId);
    if (bag.length === 0) {
      throw ApiError.badRequest(
        "All items in your bag are no longer available — please add items and try again"
      );
    }

    for (const item of bag) {
      if (item.productId.stock < item.quantity) {
        console.warn(
          `[checkout] insufficient stock for product ${item.productId._id} ` +
            `(${item.productId.name}, size ${item.size}, color ${item.color || "n/a"}): ` +
            `requested ${item.quantity}, available ${item.productId.stock}`
        );
        throw ApiError.badRequest(
          `${item.productId.name} only has ${item.productId.stock} left in stock`
        );
      }
    }

    const items = bag.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.name,
      productImage: item.productId.images?.[0],
      size: item.size,
      color: item.color || null,
      unitPriceCents: Math.round(item.productId.price * 100),
      quantity: item.quantity,
    }));
    const subtotalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

    const order = await new Order({
      userId,
      invoiceNumber: generateInvoiceNumber(),
      status: "pending",
      paymentMethod,
      currency,
      subtotalCents,
      taxCents: 0,
      shippingCents: 0,
      totalCents: subtotalCents,
      shippingAddress,
      items,
      statusHistory: [{ status: "pending", note: "Order created, awaiting payment" }],
    }).save();

    const intent = await createPaymentIntent({
      amountCents: order.totalCents,
      currency,
      orderId: order._id,
    });

    await new Payment({
      orderId: order._id,
      provider: "stripe",
      providerIntentId: intent.id,
      amountCents: order.totalCents,
      status: "requires_action",
    }).save();

    // Bag is cleared only after payment confirms (webhook), not here —
    // keeps items recoverable if payment fails or is abandoned.
    return { order, clientSecret: intent.client_secret };
  },

  async listOrders(userId, query = {}) {
    const filter = { userId };
    if (query.status) filter.status = query.status;
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.dateFrom || query.dateTo) {
      filter.placedAt = {};
      if (query.dateFrom) filter.placedAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.placedAt.$lte = new Date(query.dateTo);
    }

    const page = parseInt(query.page) || 1;
    const pageSize = Math.min(parseInt(query.pageSize) || 20, 100);

    // Whitelisted sort fields only — never pass req.query straight into
    // .sort() (arbitrary field/injection risk). Defaults to newest first.
    const SORT_FIELDS = { placedAt: "placedAt", total: "totalCents", status: "status" };
    const sortField = SORT_FIELDS[query.sortBy] || "placedAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      Order.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Order.countDocuments(filter),
    ]);

    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  async getOrderDetail(userId, orderId) {
    const order = await Order.findOne({ _id: orderId, userId }).populate("items.productId");
    if (!order) return null;
    const payments = await Payment.find({ orderId }).sort({ createdAt: -1 });
    return { order, payments };
  },

  async reorder(userId, orderId) {
    const orig = await Order.findOne({ _id: orderId, userId });
    if (!orig) return { error: "not_found" };
    if (orig.items.length === 0) return { error: "no_items" };

    for (const item of orig.items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return { error: "out_of_stock", productName: item.productName };
      }
    }

    const subtotalCents = orig.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    const newOrder = await new Order({
      userId,
      invoiceNumber: generateInvoiceNumber(),
      status: "pending",
      paymentMethod: orig.paymentMethod,
      currency: orig.currency,
      subtotalCents,
      totalCents: subtotalCents,
      shippingAddress: orig.shippingAddress,
      items: orig.items,
      statusHistory: [{ status: "pending", note: "Order created via reorder" }],
    }).save();

    return { order: newOrder };
  },

  // Advances an order through fulfillment. Order.status only models
  // shipped/delivered — "out for delivery" is a sub-state of "shipped" that
  // doesn't move order.status, it just logs a statusHistory entry and fires
  // its own notification category, since the spec calls it out separately.
  //
  // NOTE: this has no ownership/role check beyond being logged in — this
  // codebase has no admin/logistics role system. In production this should
  // be restricted to staff/an internal service, not any authenticated user.
  async advanceStatus(orderId, action, tracking = {}) {
    const order = await Order.findById(orderId);
    if (!order) return { error: "not_found" };

    const ACTIONS = {
      ship: {
        from: ["processing"],
        toStatus: "shipped",
        note: "Order shipped",
        category: "SHIPPING_UPDATE",
        title: "Your order has shipped",
        message: (o) => `Order ${o.invoiceNumber} is on its way.`,
      },
      out_for_delivery: {
        from: ["shipped"],
        toStatus: "shipped", // sub-state, order.status doesn't change
        note: "Out for delivery",
        category: "OUT_FOR_DELIVERY",
        title: "Out for delivery",
        message: (o) => `Order ${o.invoiceNumber} is out for delivery today.`,
      },
      deliver: {
        from: ["shipped"],
        toStatus: "delivered",
        note: "Order delivered",
        category: "DELIVERED",
        title: "Order delivered",
        message: (o) => `Order ${o.invoiceNumber} has been delivered.`,
      },
    };

    const def = ACTIONS[action];
    if (!def) return { error: "invalid_action" };
    if (!def.from.includes(order.status)) {
      return { error: "not_eligible", currentStatus: order.status };
    }

    order.status = def.toStatus;
    order.statusHistory.push({ status: def.toStatus, note: def.note });
    if (action === "ship" && (tracking.number || tracking.carrier)) {
      order.tracking = { ...order.tracking, ...tracking };
    }
    await order.save();

    emitToUser(order.userId, "order:status-change", { orderId: order._id, status: order.status, note: def.note });
    await dispatchNotification({
      userId: order.userId,
      category: def.category,
      title: def.title,
      message: def.message(order),
      data: { orderId: order._id },
    });

    return { order };
  },

  async requestCancellationOrReturn(userId, orderId, type, reason) {
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return { error: "not_found" };

    const allowed = type === "cancellation" ? CANCELLABLE_STATUSES : RETURNABLE_STATUSES;
    if (!allowed.includes(order.status)) {
      return { error: "not_eligible", currentStatus: order.status };
    }

    const request = await new CancellationRequest({ orderId, type, reason }).save();

    if (type === "return") {
      await dispatchNotification({
        userId,
        category: "ORDER_RETURNED",
        title: "Return requested",
        message: `Your return request for order ${order.invoiceNumber} has been received.`,
        data: { orderId: order._id },
      });
    }

    if (type === "cancellation") {
      // Cancellation is auto-approved and restocks immediately; return
      // requests need manual/logistics approval, so status stays "requested".
      // Order status flip + per-item restock must commit together — a crash
      // mid-loop otherwise leaves stock inconsistent with order status.
      const wasOutOfStock = new Set(
        (
          await Product.find({ _id: { $in: order.items.map((i) => i.productId) }, stock: 0 }).select("_id")
        ).map((p) => String(p._id))
      );

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          order.status = "cancelled";
          order.statusHistory.push({ status: "cancelled", note: reason || "Cancelled by customer" });
          await order.save({ session });
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: item.quantity } },
              { session }
            );
          }
        });
      } finally {
        await session.endSession();
      }
      emitToUser(userId, "order:status-change", { orderId: order._id, status: "cancelled" });
      await dispatchNotification({
        userId,
        category: "ORDER_CANCELLED",
        title: "Order cancelled",
        message: `Your order ${order.invoiceNumber} has been cancelled.`,
        data: { orderId: order._id },
      });

      // Notify wishlisters for any item that genuinely went 0 -> positive.
      for (const productId of wasOutOfStock) {
        const restocked = await Product.findById(productId);
        if (restocked && restocked.stock > 0) {
          await notifyBackInStock(restocked);
        }
      }
    }

    return { request };
  },
};

module.exports = { orderService };
