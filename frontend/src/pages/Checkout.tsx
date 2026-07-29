import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "../lib/api";
import { useCart } from "../context/CartContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

export function Checkout() {
  const { bag, refresh } = useCart();
  const [shippingAddress, setShippingAddress] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subtotal = bag.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);
  const changedItems = bag.filter((item) => item.priceChanged);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/order/create", {
        shippingAddress,
        paymentMethod: "card",
      });
      setClientSecret(res.data.clientSecret);
      setOrderId(res.data.order._id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not start checkout");
    } finally {
      setLoading(false);
    }
  }

  if (bag.length === 0 && !orderId) {
    return <div className="mx-auto max-w-md px-4 py-16 text-(--color-muted)">Your bag is empty.</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl italic">Checkout</h1>
      <p className="mt-2 text-sm text-(--color-muted)">Subtotal: ₹{subtotal}</p>
      {changedItems.length > 0 && (
        <p className="mt-2 rounded-md bg-(--color-berry)/10 px-3 py-2 text-xs text-(--color-berry)">
          {changedItems.length === 1 ? "1 item's" : `${changedItems.length} items'`} price changed since you
          added it to your bag — the total above already reflects the current price.
        </p>
      )}

      {!clientSecret ? (
        <form onSubmit={startCheckout} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-(--color-muted)">Shipping address</span>
            <textarea
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-(--color-line) bg-(--color-paper-raised) px-3 py-2 outline-none focus:border-(--color-berry) dark:bg-(--color-paper-raised) dark:border-(--color-line)"
            />
          </label>
          {error && <p className="text-sm text-(--color-berry)">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-full bg-(--color-berry) py-3 text-sm text-white disabled:opacity-50"
          >
            {loading ? "Preparing payment..." : "Continue to payment"}
          </button>
        </form>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm orderId={orderId!} onSuccess={refresh} />
        </Elements>
      )}
    </div>
  );
}

function PaymentForm({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Payment form is still loading — please wait a moment and try again.");
      return;
    }
    setProcessing(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setProcessing(false);
      return;
    }

    // Actual order status flips via Stripe webhook (server-side), so we just
    // navigate to the order — its status will update in real time via socket.
    onSuccess();
    navigate(`/orders/${orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <PaymentElement />
      {!stripe && <p className="text-sm text-(--color-muted)">Loading payment form…</p>}
      {error && <p className="text-sm text-(--color-berry)">{error}</p>}
      <button
        disabled={!stripe || processing}
        className="w-full rounded-full bg-(--color-berry) py-3 text-sm text-white disabled:opacity-50"
      >
        {processing ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}
