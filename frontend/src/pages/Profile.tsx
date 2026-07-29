import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { NotificationPreferences, Product } from "../types";

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  orderConfirmation: "Order confirmations",
  paymentUpdates: "Payment updates",
  shippingUpdates: "Shipping updates",
  deliveryStatus: "Delivery status",
  wishlistPriceDrop: "Wishlist price drops",
  backInStock: "Back in stock alerts",
  promotional: "Promotions",
  abandonedCart: "Abandoned cart reminders",
};

export function Profile() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [history, setHistory] = useState<{ productId: Product }[]>([]);

  useEffect(() => {
    api.get("/notifications/preferences").then((res) => setPrefs(res.data));
    api.get("/history").then((res) => setHistory(res.data));
  }, []);

  async function togglePref(key: keyof NotificationPreferences) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await api.put("/notifications/preferences", { [key]: updated[key] });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl italic">Profile</h1>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-(--color-muted)">Account</h2>
        <p>{user?.fullName}</p>
        <p className="text-sm text-(--color-muted)">{user?.email}</p>
        <button onClick={logout} className="mt-3 text-sm text-(--color-berry)">Log out</button>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-(--color-muted)">Appearance</h2>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-full border px-4 py-2 text-sm capitalize ${
                theme === t ? "border-(--color-ink) bg-(--color-ink) text-white dark:border-white dark:bg-white dark:text-black" : "border-(--color-line) dark:border-(--color-line)"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {prefs && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-(--color-muted)">Notification preferences</h2>
          <div className="space-y-2">
            {(Object.keys(PREF_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
              <label key={key} className="flex items-center justify-between text-sm">
                <span>{PREF_LABELS[key]}</span>
                <input type="checkbox" checked={prefs[key]} onChange={() => togglePref(key)} />
              </label>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-(--color-muted)">Recently viewed</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {history.map((h) => (
              <Link key={h.productId._id} to={`/product/${h.productId._id}`} className="aspect-square rounded-md bg-(--color-line)">
                {h.productId.images?.[0] && (
                  <img src={h.productId.images[0]} className="h-full w-full rounded-md object-cover" />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
