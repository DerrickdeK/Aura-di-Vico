// Minimal service worker: registers itself so the app can use the Notifications
// API even when in the background, and shows a notification when posted.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "whisper-notify") {
    const { title, body, tag } = data.payload || {};
    self.registration.showNotification(title || "Aura is calling", {
      body: body || "",
      tag: tag || "aura-whisper",
      renotify: true,
      silent: false,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (all.length > 0) {
      all[0].focus();
    } else {
      await self.clients.openWindow("/");
    }
  })());
});
