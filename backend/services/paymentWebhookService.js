const mongoose = require("mongoose");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const PaymentEvent = require("../models/PaymentEvent");
const Bag = require("../models/Bag");
const Product = require("../models/Product");
const { emitToUser } = require("../sockets");
const { dispatchNotification } = require("./notificationService");

async function handleStripeEvent(event) {
  const orderId = event.data.object.metadata?.orderId || null;

  // Idempotency: unique index on providerEventId means a redelivered webhook
  // throws E11000 on insert — we catch that specific case and treat it as
  // "already processed", so retried Stripe webhooks never double-apply.
  try {
    await new PaymentEvent({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      orderId,
      payload: event,
    }).save();
  } catch (err) {
    if (err.code === 11000) return { duplicate: true };
    throw err;
  }

  await applyEventSideEffects(event, orderId);
  return { duplicate: false };
}

async function applyEventSideEffects(event, orderId) {
  const intent = event.data.object;

  switch (event.type) {
    case "payment_intent.succeeded": {
      await Payment.findOneAndUpdate(
        { providerIntentId: intent.id },
        { status: "succeeded", amountCents: intent.amount },
        { upsert: true }
      );
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.status === "pending") {
          // Order status flip + per-item stock decrement + bag clear must
          // all commit together — a crash mid-loop previously could decrement
          // some items' stock without marking the order processed, or clear
          // the bag before stock was actually reserved.
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              order.status = "processing";
              order.statusHistory.push({ status: "processing", note: "Payment confirmed" });
              await order.save({ session });

              for (const item of order.items) {
                await Product.updateOne(
                  { _id: item.productId },
                  { $inc: { stock: -item.quantity } },
                  { session }
                );
              }
              await Bag.deleteMany({ userId: order.userId }, { session });
            });
          } finally {
            await session.endSession();
          }

          emitToUser(order.userId, "order:status-change", { orderId: order._id, status: "processing" });
          await dispatchNotification({
            userId: order.userId,
            category: "PAYMENT_SUCCESS",
            title: "Payment successful",
            message: `Payment for order ${order.invoiceNumber} was successful.`,
            data: { orderId: order._id },
          });
          await dispatchNotification({
            userId: order.userId,
            category: "ORDER_CONFIRMATION",
            title: "Order confirmed",
            message: `Your order ${order.invoiceNumber} has been confirmed and is being processed.`,
            data: { orderId: order._id },
          });
        }
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const payment = await Payment.findOneAndUpdate(
        { providerIntentId: intent.id },
        { status: "failed", amountCents: intent.amount },
        { upsert: true, new: true }
      );
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          await dispatchNotification({
            userId: order.userId,
            category: "PAYMENT_FAILED",
            title: "Payment failed",
            message: `Payment for order ${order.invoiceNumber} did not go through.`,
            data: { orderId: order._id },
          });
        }
      }
      break;
    }
    case "charge.refunded": {
      if (orderId) {
        const order = await Order.findByIdAndUpdate(
          orderId,
          { status: "refunded", $push: { statusHistory: { status: "refunded", note: "Refund processed" } } },
          { new: true }
        );
        if (order) {
          emitToUser(order.userId, "order:status-change", { orderId: order._id, status: "refunded" });
          await dispatchNotification({
            userId: order.userId,
            category: "PAYMENT_SUCCESS",
            title: "Refund processed",
            message: `Your refund for order ${order.invoiceNumber} has been processed.`,
            data: { orderId: order._id },
          });
        }
      }
      break;
    }
    default:
      break; // stored for audit even if no action taken
  }
}

module.exports = { handleStripeEvent };
