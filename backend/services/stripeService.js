const Stripe = require("stripe");
const { ApiError } = require("../utils/ApiError");

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const isConfigured = !!STRIPE_KEY && !STRIPE_KEY.includes("placeholder");
const stripe = new Stripe(STRIPE_KEY || "sk_test_placeholder");

async function createPaymentIntent({ amountCents, currency, orderId }) {
  if (!isConfigured) {
    // Without this check, Stripe's SDK throws a raw (non-ApiError) auth
    // error here, which the generic error handler turns into an opaque
    // "Something went wrong" — impossible to debug from the frontend alone.
    throw ApiError.serviceUnavailable(
      "Payments aren't configured yet — add a real STRIPE_SECRET_KEY to backend/.env (get a free test key from dashboard.stripe.com) and restart the server."
    );
  }
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    metadata: { orderId: String(orderId) },
  });
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signatureHeader,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = { stripe, createPaymentIntent, verifyWebhookSignature };
