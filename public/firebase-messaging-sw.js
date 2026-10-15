/* eslint-disable no-restricted-globals */
// Daymark Service Worker — PWA Lifecycle & Firebase Cloud Messaging (FCM) Web Push Handler

// 1. Import Firebase 10.13.2 Compat scripts required by FCM Web Push in Service Workers
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// 2. Initialize Firebase within Service Worker scope
firebase.initializeApp({
  apiKey: "AIzaSyBLUiwmGEJLUA29wTCrurmC-EVOLd84gAo",
  authDomain: "daymark-tracker.firebaseapp.com",
  projectId: "daymark-tracker",
  storageBucket: "daymark-tracker.firebasestorage.app",
  messagingSenderId: "107580700669",
  appId: "1:107580700669:web:a1253c47590529bc704b94"
});

const messaging = firebase.messaging();

const CACHE_NAME = "daymark-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/badge-72.png",
  "/favicon.ico"
];

// 3. Install Event — Pre-cache essential app shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 4. Activate Event — Clean up stale caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 5. Fetch Event — Network-first strategy with cache fallback for navigation and static assets
self.addEventListener("fetch", (event) => {
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

// 6. FCM onBackgroundMessage Handler — Standard Firebase background notification handler
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "Daymark Reminder";
  const body =
    notification.body ||
    data.body ||
    "You have a scheduled habit or task reminder.";
  const icon = notification.icon || data.icon || "/icons/icon-192.png";
  const badge = "/icons/badge-72.png";
  const tag = data.tag || notification.tag || `daymark-reminder-${Date.now()}`;
  const clickUrl = data.url || data.click_action || "/daily";

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [150, 50, 150],
    data: {
      url: clickUrl,
      timestamp: Date.now(),
      reminderId: data.reminderId || null,
      category: data.category || "reminder",
      ...data
    },
    actions: [
      {
        action: "open",
        title: "View in Daymark"
      },
      {
        action: "dismiss",
        title: "Dismiss"
      }
    ]
  };

  return self.registration.showNotification(title, options);
});

// 7. Push Event Fallback — Ensures raw Web Push payloads are also handled gracefully
self.addEventListener("push", (event) => {
  if (!event.data) return;

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

  // If Firebase compat onBackgroundMessage already processed this FCM payload, skip duplicate display
  if (payload.from && payload.fcmMessageId) {
    // FCM will route to onBackgroundMessage
    return;
  }

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
    vibrate: [150, 50, 150],
    data: {
      url: clickUrl,
      timestamp: Date.now(),
      ...customData
    },
    actions: [
      {
        action: "open",
        title: "View in Daymark"
      },
      {
        action: "dismiss",
        title: "Dismiss"
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 8. Notification Click Event — Focus existing tab or open target route
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
