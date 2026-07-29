import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";
import type { Notification } from "../types";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Push subscription needs the VAPID public key as a Uint8Array, but the
// server hands it out (and env vars store it) as URL-safe base64.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Registers the service worker and subscribes this device to Web Push,
// sending the subscription to the backend for storage. Silently no-ops if
// the browser doesn't support push, the user hasn't granted permission, or
// the VAPID key isn't configured — push is an enhancement, never required
// for the rest of the app to work.
async function ensurePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const json = subscription.toJSON();
    await api.post("/notifications/push/subscribe", {
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    });
  } catch (err) {
    // Push is best-effort — a failure here shouldn't block anything else.
    console.warn("Push subscription failed:", err);
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function refresh() {
    if (!user) return;
    const res = await api.get("/notifications");
    setNotifications(res.data.data);
    setUnreadCount(res.data.unreadCount);
  }

  useEffect(() => {
    refresh();
    if (user) ensurePushSubscription();
  }, [user]);

useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif: any) => {              
      setNotifications((prev) => [{ ...notif, _id: notif.id, isRead: false }, ...prev]); 
      setUnreadCount((c) => c + 1);               
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [user]);
  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
