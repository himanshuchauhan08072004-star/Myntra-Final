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
    window.location.reload();
  }

  const subtotal = bag.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

  return (
    <div className="px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-6xl">
        <span className="eyebrow">{bag.length} item{bag.length !== 1 ? "s" : ""}</span>
        <h1 className="mt-3 font-display text-5xl italic sm:text-7xl">Your Edit</h1>

        {bag.length === 0 ? (
          <p className="mt-12 text-(--color-muted)">
            Your bag is empty. <Link to="/products" className="text-(--color-berry)">Start shopping</Link>
          </p>
        ) : (
          <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_340px]">
            <div>
              {bag.map((item) => (
                <div key={item._id} className="grid grid-cols-[96px_1fr] gap-5 border-b border-(--color-line) py-7 first:pt-0 sm:grid-cols-[140px_1fr]">
                  <Link to={`/product/${item.productId._id}`} className="aspect-[3/4] overflow-hidden rounded-sm bg-(--color-paper-sunken)">
                    {item.productId.images?.[0] && (
                      <img src={item.productId.images[0]} onError={(e) => (e.currentTarget.style.display = "none")} className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-(--color-muted)">{item.productId.brand}</p>
                        <p className="mt-1 font-display text-lg italic">{item.productId.name}</p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          Size {item.size}
                          {item.color ? ` · ${item.color}` : ""}
                        </p>
                      </div>
                      <p className="font-mono">₹{item.productId.price * item.quantity}</p>
                    </div>

                    {item.priceChanged && item.priceCentsAtAdd != null && (
                      <p className="mt-2 text-xs text-(--color-berry)">
                        Price changed since you added this — now ₹{(item.currentPriceCents! / 100).toFixed(2)}
                        {" "}(was ₹{(item.priceCentsAtAdd / 100).toFixed(2)})
                      </p>
                    )}

                    <div className="mt-auto flex items-center gap-4 pt-4 text-sm">
                      <select
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item._id, Number(e.target.value))}
                        className="rounded-sm border border-(--color-line) bg-(--color-paper) px-2 py-1"
                      >
                        {Array.from({ length: Math.min(item.productId.stock, 10) }).map((_, i) => (
                          <option key={i} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                      <button onClick={() => saveForLater(item._id)} className="text-(--color-berry)">
                        Save for later
                      </button>
                      <button onClick={() => removeFromBag(item._id)} aria-label="Remove" className="ml-auto text-(--color-muted) transition-colors hover:text-(--color-berry)">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {error && <p className="mt-3 text-sm text-(--color-berry)">{error}</p>}
            </div>

            <div className="lg:sticky lg:top-32 lg:self-start">
              <span className="eyebrow">Summary</span>
              <p className="mt-5 flex justify-between text-2xl font-display italic">
                <span>Total</span><span className="font-mono not-italic text-lg">₹{subtotal}</span>
              </p>
              <p className="mt-2 mb-6 text-xs text-(--color-muted)">Tax and shipping calculated at checkout.</p>
              <Link to="/checkout" className="btn btn-accent block w-full text-center">
                Checkout
              </Link>
            </div>
          </div>
        )}

        {saved.length > 0 && (
          <section className="mt-20 border-t border-(--color-line) pt-12">
            <span className="eyebrow">On hold</span>
            <h2 className="mt-2 mb-6 font-display text-2xl italic">Saved for later</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {saved.map((item) => (
                <div key={item._id} className="surface rounded-sm p-3">
                  <div className="aspect-square overflow-hidden rounded-sm bg-(--color-paper-sunken)">
                    {item.productId.images?.[0] && (
                      <img src={item.productId.images[0]} onError={(e) => (e.currentTarget.style.display = "none")} className="h-full w-full object-cover" />
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
    </div>
  );
}
