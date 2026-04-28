// Distance + vibration utilities for the proximity radar.

// Haversine distance in meters between two lat/lng pairs.
export function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Compute bearing in degrees from point A to point B (0=N, 90=E).
export function bearingDeg(a, b) {
  if (!a || !b) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Vibration pattern based on distance to POI:
// closer -> faster, stronger pulses. Returns a navigator.vibrate() pattern array.
export function vibrationPatternFor(distance, triggerRadius = 60) {
  if (distance == null || !isFinite(distance)) return null;
  // far away (> 3x radius): no vibration
  if (distance > triggerRadius * 4) return null;
  // closer than 8m: continuous "you're here" buzz
  if (distance < 8) return [600];
  // map distance in (8, 4r) to a pulse interval (60-700ms)
  const ratio = Math.min(1, Math.max(0, (distance - 8) / (triggerRadius * 4 - 8)));
  const pulse = Math.round(40 + ratio * 90);   // 40..130ms vibration
  const pause = Math.round(120 + ratio * 900); // 120..1020ms pause
  return [pulse, pause];
}

import { devWarn } from "./log";

// Trigger a vibration once (no-ops if API is unavailable).
export function vibrate(pattern) {
  try {
    if (pattern && navigator?.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    devWarn("Vibration API call failed:", err);
  }
}

export function stopVibration() {
  try {
    navigator?.vibrate?.(0);
  } catch (err) {
    devWarn("Failed to stop vibration:", err);
  }
}
