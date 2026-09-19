import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Check } from "lucide-react";
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
    return <div className="mx-auto max-w-md px-4 py-24 text-(--color-muted)">Your bag is empty.</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <span className="eyebrow">Checkout</span>
      <h1 className="mt-2 font-display text-3xl italic sm:text-4xl">Complete your order</h1>

      <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-wide">
        <StepDot done={true} label="Address" />
        <div className="h-px w-8 bg-(--color-line)" />
        <StepDot done={!!clientSecret} active={!clientSecret} label="Payment" />
      </div>

      <p className="mt-6 text-sm text-(--color-muted)">Subtotal: <span className="font-mono">₹{subtotal}</span></p>
      {changedItems.length > 0 && (
        <p className="mt-2 rounded-sm bg-(--color-berry)/10 px-3 py-2 text-xs text-(--color-berry)">
          {changedItems.length === 1 ? "1 item's" : `${changedItems.length} items'`} price changed since you
          added it to your bag — the total above already reflects the current price.
        </p>
      )}

      {!clientSecret ? (
        <form onSubmit={startCheckout} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-(--color-muted)">Shipping address</span>
            <textarea
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={3}
              className="input-field"
            />
          </label>
          {error && <p className="text-sm text-(--color-berry)">{error}</p>}
          <button disabled={loading} className="btn btn-accent w-full">
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

function StepDot({ done, active, label }: { done?: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
          done
            ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)"
            : active
            ? "border-(--color-berry) text-(--color-berry)"
            : "border-(--color-line) text-(--color-muted)"
        }`}
      >
        {done ? <Check size={11} /> : ""}
      </span>
      <span className={active || done ? "text-(--color-ink)" : "text-(--color-muted)"}>{label}</span>
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
      <button disabled={!stripe || processing} className="btn btn-accent w-full">
        {processing ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}
