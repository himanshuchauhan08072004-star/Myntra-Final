import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";
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
  const { theme, setThemeExplicit } = useTheme();
  const { pushPermission, requestPushPermission } = useNotifications();
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <span className="eyebrow">Account</span>
      <h1 className="mt-2 font-display text-3xl italic sm:text-4xl">Profile</h1>

      <section className="mt-10 border-b border-(--color-line) pb-8">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-(--color-muted)">Account</h2>
        <p className="font-medium">{user?.fullName}</p>
        <p className="text-sm text-(--color-muted)">{user?.email}</p>
        <button onClick={logout} className="mt-3 text-sm text-(--color-berry)">Log out</button>
      </section>

      <section className="mt-8 border-b border-(--color-line) pb-8">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-(--color-muted)">Appearance</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setThemeExplicit("light")}
            className={`btn ${theme === "light" ? "btn-primary" : "btn-outline"}`}
          >
            <Sun size={15} /> Day
          </button>
          <button
            onClick={() => setThemeExplicit("dark")}
            className={`btn ${theme === "dark" ? "btn-primary" : "btn-outline"}`}
          >
            <Moon size={15} /> Night
          </button>
        </div>
      </section>

      <section className="mt-8 border-b border-(--color-line) pb-8">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-(--color-muted)">Push notifications</h2>
        {pushPermission === "unsupported" && (
          <p className="text-sm text-(--color-muted)">Not supported on this browser.</p>
        )}
        {pushPermission === "granted" && <p className="text-sm text-(--color-muted)">Enabled on this device.</p>}
        {pushPermission === "denied" && (
          <p className="text-sm text-(--color-muted)">
            Blocked — enable notifications for this site in your browser settings, then reload.
          </p>
        )}
        {pushPermission === "default" && (
          <button onClick={requestPushPermission} className="btn btn-accent">
            Enable push notifications
          </button>
        )}
      </section>

      {prefs && (
        <section className="mt-8 border-b border-(--color-line) pb-8">
          <h2 className="mb-3 text-xs uppercase tracking-wide text-(--color-muted)">Notification preferences</h2>
          <div className="space-y-2.5">
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
          <h2 className="mb-3 text-xs uppercase tracking-wide text-(--color-muted)">Recently viewed</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {history.map((h) => (
              <Link key={h.productId._id} to={`/product/${h.productId._id}`} className="aspect-square overflow-hidden rounded-sm bg-(--color-paper-sunken)">
                {h.productId.images?.[0] && (
                  <img src={h.productId.images[0]} className="h-full w-full object-cover" />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
