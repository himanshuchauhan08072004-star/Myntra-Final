// Minimal service worker whose only job is Web Push delivery — this is what
// lets a notification show up even when the tab/browser is closed, which is
// the actual "push notification" requirement (Socket.io alone only works
// while the tab is open).

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Myntra", body: event.data.text() };
  }

  const title = payload.title || "Myntra";
  const options = {
    body: payload.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the OS notification focuses an existing tab if one's open,
// otherwise opens a new one — navigates to the relevant order/product when
// the payload includes one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let path = "/";
  if (data.orderId) path = `/orders/${data.orderId}`;
  else if (data.productId) path = `/product/${data.productId}`;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(path);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
    })
  );
});
