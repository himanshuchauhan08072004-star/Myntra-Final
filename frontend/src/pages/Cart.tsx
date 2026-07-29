import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useCart } from "../context/CartContext";
import type { SavedItem } from "../types";

export function Cart() {
  const { bag, updateQuantity, removeFromBag, saveForLater } = useCart();
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleQuantityChange(itemId: string, quantity: number) {
    try {
      await updateQuantity(itemId, quantity);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not update quantity");
      setTimeout(() => setError(null), 3000);
    }
  }

  async function refreshSaved() {
    const res = await api.get("/bag/save-for-later/list");
    setSaved(res.data);
  }

  useEffect(() => {
    refreshSaved();
  }, []);

  async function moveToBag(savedItemId: string) {
    await api.post(`/bag/save-for-later/${savedItemId}/move-to-bag`);
    await refreshSaved();
    window.location.reload(); // simplest way to refresh both bag + saved lists in this MVP
  }

  const subtotal = bag.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl italic">Your bag</h1>

      {bag.length === 0 ? (
        <p className="mt-8 text-(--color-muted)">
          Your bag is empty. <Link to="/products" className="text-(--color-berry)">Start shopping</Link>
        </p>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            {bag.map((item) => (
              <div key={item._id} className="flex gap-4 border-b border-(--color-line) pb-4 dark:border-(--color-line)">
                <div className="h-24 w-20 shrink-0 rounded-md bg-(--color-line)">
                  {item.productId.images?.[0] && (
                    <img src={item.productId.images[0]} onError={(e) => (e.currentTarget.style.display = "none")} className="h-full w-full rounded-md object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.productId.name}</p>
                  <p className="text-sm text-(--color-muted)">
                    Size: {item.size}
                    {item.color ? ` · Color: ${item.color}` : ""}
                  </p>
                  {item.priceChanged && item.priceCentsAtAdd != null && (
                    <p className="mt-1 text-xs text-(--color-berry)">
                      Price changed since you added this —{" "}
                      {item.currentPriceCents! > item.priceCentsAtAdd ? "now" : "now only"} ₹
                      {(item.currentPriceCents! / 100).toFixed(2)} (was ₹{(item.priceCentsAtAdd / 100).toFixed(2)})
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item._id, Number(e.target.value))}
                      className="rounded-md border border-(--color-line) px-2 py-1 text-sm dark:border-(--color-line) dark:bg-(--color-paper-raised)"
                    >
                      {Array.from({ length: Math.min(item.productId.stock, 10) }).map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    {error && <span className="text-xs text-(--color-berry)">{error}</span>}
                    <button onClick={() => saveForLater(item._id)} className="text-xs text-(--color-berry)">
                      Save for later
                    </button>
                    <button onClick={() => removeFromBag(item._id)} aria-label="Remove" className="ml-auto text-(--color-muted)">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="font-[family-name:var(--font-mono)]">₹{item.productId.price * item.quantity}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-(--color-line) p-4 dark:border-(--color-line)">
            <p className="mb-2 flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal}</span></p>
            <p className="mb-4 text-xs text-(--color-muted)">Tax and shipping calculated at checkout.</p>
            <Link to="/checkout" className="block rounded-full bg-(--color-berry) py-3 text-center text-sm text-white">
              Checkout
            </Link>
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl italic">Saved for later</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {saved.map((item) => (
              <div key={item._id} className="rounded-md border border-(--color-line) p-3 dark:border-(--color-line)">
                <div className="aspect-square rounded-md bg-(--color-line)">
                  {item.productId.images?.[0] && (
                    <img src={item.productId.images[0]} onError={(e) => (e.currentTarget.style.display = "none")} className="h-full w-full rounded-md object-cover" />
                  )}
                </div>
                <p className="mt-2 truncate text-sm">{item.productId.name}</p>
                <button onClick={() => moveToBag(item._id)} className="mt-1 text-xs text-(--color-berry)">
                  Move to bag
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
