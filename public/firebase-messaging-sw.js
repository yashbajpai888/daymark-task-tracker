/* eslint-disable no-restricted-globals */
// Daymark Service Worker — PWA Lifecycle & Firebase Cloud Messaging (FCM) Web Push Handler

const CACHE_NAME = "daymark-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/badge-72.png",
  "/favicon.ico"
];

// 1. Install Event — Pre-cache essential app shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event — Clean up stale caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event — Network-first strategy with cache fallback for navigation and static assets
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and avoid caching API calls or chrome-extension requests
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/") || url.protocol.startsWith("chrome-extension")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json")
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// 4. Push Event — Handle incoming FCM / Web Push notifications when app is closed or backgrounded
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      notification: {
        title: "Daymark Reminder",
        body: event.data.text() || "You have a scheduled reminder."
      }
    };
  }

  // Parse title, body, and metadata from either FCM standard payload or data payload
  const notificationData = payload.notification || {};
  const customData = payload.data || {};

  const title = notificationData.title || customData.title || "Daymark Reminder";
  const body =
    notificationData.body ||
    customData.body ||
    "You have a scheduled productivity reminder.";
  const icon = notificationData.icon || customData.icon || "/icons/icon-192.png";
  const badge = "/icons/badge-72.png";
  const tag = customData.tag || notificationData.tag || `daymark-reminder-${Date.now()}`;
  const clickUrl = customData.url || customData.click_action || "/daily";

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [100, 50, 100],
    data: {
      url: clickUrl,
      timestamp: Date.now(),
      reminderId: customData.reminderId || null,
      category: customData.category || "reminder",
      ...customData
    },
    actions: [
      {
        action: "open",
        title: "View Tasks"
      },
      {
        action: "dismiss",
        title: "Dismiss"
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event — Focus existing tab or open target route
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/daily";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If an existing Daymark window is open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no window is open, open a new window with the target URL
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
