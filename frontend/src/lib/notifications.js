// Utility to register the service worker and request the Notification permission.
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/service-worker.js");
  } catch (err) {
    console.warn("Service worker registration failed:", err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn("Notification permission request failed:", err);
    return "denied";
  }
}

export function showWhisperNotification({ title, body, tag }) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "whisper-notify",
      payload: { title, body, tag },
    });
    return;
  }
  // Fallback when SW not active yet
  try {
    const n = new Notification(title, { body, tag });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (err) {
    console.warn("Notification fallback failed:", err);
  }
}
