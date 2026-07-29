import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";
import type { BagItem } from "../types";

interface CartContextValue {
  bag: BagItem[];
  loading: boolean;
  itemCount: number;
  addToBag: (productId: string, size: string, color?: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromBag: (itemId: string) => Promise<void>;
  saveForLater: (bagItemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bag, setBag] = useState<BagItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) return setBag([]);
    setLoading(true);
    try {
      const res = await api.get("/bag");
      setBag(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [user]);

  // Real-time cross-device sync: another tab/device changes the bag, this
  // one refreshes automatically instead of showing stale contents.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => refresh();
    socket.on("cart:update", handler);
    return () => {
      socket.off("cart:update", handler);
    };
  }, [user]);

  async function addToBag(productId: string, size: string, color?: string, quantity = 1) {
    await api.post("/bag", { productId, size, color, quantity });
    await refresh();
  }

  async function updateQuantity(itemId: string, quantity: number) {
    await api.patch(`/bag/${itemId}`, { quantity });
    await refresh();
  }

  async function removeFromBag(itemId: string) {
    await api.delete(`/bag/${itemId}`);
    await refresh();
  }

  async function saveForLater(bagItemId: string) {
    await api.post(`/bag/save-for-later/${bagItemId}`);
    await refresh();
  }

  const itemCount = bag.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ bag, loading, itemCount, addToBag, updateQuantity, removeFromBag, saveForLater, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
