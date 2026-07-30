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
  pushPermission: NotificationPermission | "unsupported";
  requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush() {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  const registration = await navigator.serviceWorker.register("/sw.js");
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
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  });

  async function refresh() {
    if (!user) return;
    const res = await api.get("/notifications");
    setNotifications(res.data.data);
    setUnreadCount(res.data.unreadCount);
  }

  async function requestPushPermission() {
    if (pushPermission === "unsupported") {
      alert("Push notifications aren't supported on this browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        alert(
          permission === "denied"
            ? "Notifications are blocked for this site. Enable them in your browser's site settings, then try again."
            : "Notification permission was not granted."
        );
        return;
      }
      await subscribeToPush();
      alert("Push notifications enabled.");
    } catch (err) {
      alert("Could not enable push notifications: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  useEffect(() => {
    refresh();
    if (user && pushPermission === "granted") {
      subscribeToPush().catch((err) => console.warn("Push resubscribe failed:", err));
    }
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif: { id: string; category: string; title: string; message: string; data: unknown; createdAt: string }) => {
      setNotifications((prev) => [{ ...notif, _id: notif.id, isRead: false } as unknown as Notification, ...prev]);
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
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, refresh, pushPermission, requestPushPermission }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}