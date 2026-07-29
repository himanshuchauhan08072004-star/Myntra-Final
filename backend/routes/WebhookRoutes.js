const express = require("express");
const { verifyWebhookSignature } = require("../services/stripeService");
const { handleStripeEvent } = require("../services/paymentWebhookService");
const router = express.Router();

// Mounted with express.raw() in server.js — Stripe signature verification
// needs the exact raw bytes, not the parsed/re-serialized JSON body.
router.post("/stripe", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = verifyWebhookSignature(req.body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ message: "Invalid signature" });
  }

  try {
    const result = await handleStripeEvent(event);
    res.status(200).json(result);
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still 200 so Stripe doesn't retry-storm on our internal bug; event is
    // already recorded in PaymentEvent for manual replay/audit.
    res.status(200).json({ received: true, processingError: true });
  }
});

module.exports = router;
