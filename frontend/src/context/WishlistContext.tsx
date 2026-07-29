import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import type { WishlistItem } from "../types";

interface ToggleResult {
  ok: boolean;
  wasWishlisted: boolean;
  error?: string;
}

interface WishlistContextValue {
  items: WishlistItem[];
  productIds: Set<string>;
  loading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => Promise<ToggleResult>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) return setItems([]);
    setLoading(true);
    try {
      const res = await api.get("/wishlist");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [user]);

  const productIds = new Set(items.map((i) => i.productId._id));

  function isWishlisted(productId: string) {
    return productIds.has(productId);
  }

  // Toggle add/remove — optimistic update so the heart flips instantly,
  // reconciled with the server response (or rolled back on failure).
  // Returns whether the toggle actually succeeded plus the real backend
  // error message, so callers can show what actually went wrong instead of
  // a generic message that hides the real cause.
  async function toggle(productId: string): Promise<ToggleResult> {
    if (!user) return { ok: false, wasWishlisted: false, error: "Log in to save to wishlist" };
    const existing = items.find((i) => i.productId._id === productId);
    if (existing) {
      const prev = items;
      setItems((cur) => cur.filter((i) => i._id !== existing._id));
      try {
        await api.delete(`/wishlist/${existing._id}`);
        return { ok: true, wasWishlisted: true };
      } catch (err: any) {
        console.error("Failed to remove from wishlist:", err);
        setItems(prev);
        return { ok: false, wasWishlisted: true, error: err.response?.data?.message };
      }
    } else {
      try {
        await api.post("/wishlist", { productId });
        await refresh();
        return { ok: true, wasWishlisted: false };
      } catch (err: any) {
        console.error("Failed to add to wishlist:", err);
        return { ok: false, wasWishlisted: false, error: err.response?.data?.message };
      }
    }
  }

  return (
    <WishlistContext.Provider value={{ items, productIds, loading, isWishlisted, toggle, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
