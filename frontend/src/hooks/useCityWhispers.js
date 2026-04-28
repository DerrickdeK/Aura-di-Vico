import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { distanceMeters, bearingDeg, vibrate } from "../lib/geo";
import { playChime, CHIMES } from "../lib/audio";
import { showWhisperNotification } from "../lib/notifications";
import { getOpeningLine } from "../lib/i18n";

// Default zone radii — overridden by /api/config at runtime.
const DEFAULT_ZONES = { sensed_radius_m: 200, called_radius_m: 80, found_radius_m: 25 };

// Vibration patterns per zone (ms). Found > Called > Sensed.
const PATTERNS = {
  sensed: [60, 80, 60],
  called: [80, 60, 80, 60, 120],
  found:  [400, 80, 400],
};

function classifyZone(distance, radii) {
  if (distance <= radii.found_radius_m) return "found";
  if (distance <= radii.called_radius_m) return "called";
  if (distance <= radii.sensed_radius_m) return "sensed";
  return null;
}

const ZONE_RANK = { sensed: 1, called: 2, found: 3 };

/**
 * Watches all visible POIs against the user position and emits zone-entry
 * events. Returns:
 *   - sightings: array of { poi, distance, bearing, zone } currently in any zone
 *   - upgrade(poi.id): manual upgrade hook (unused for now)
 *   - radii (resolved from /api/config)
 */
export default function useCityWhispers({
  position,
  pois,
  language = "en",
  notificationsEnabled = false,
  enabled = true,
  onFound, // callback(poi) when a POI is upgraded to "found"
}) {
  const [radii, setRadii] = useState(DEFAULT_ZONES);
  const [sightings, setSightings] = useState([]);
  // Track best zone per POI to avoid re-triggering chimes/notifications.
  const stateRef = useRef(new Map());

  useEffect(() => {
    api.get("/config")
      .then(({ data }) => data?.zones && setRadii(data.zones))
      .catch(() => {});
  }, []);

  const trigger = useCallback((poi, zone) => {
    // Vibrate
    vibrate(PATTERNS[zone]);
    // Audio chime
    playChime(CHIMES[zone]);
    // Background notification only when called/found, and only if user opted in
    if (notificationsEnabled && (zone === "called" || zone === "found")) {
      const line = getOpeningLine(poi, language);
      showWhisperNotification({
        title: zone === "found" ? `You found ${poi.name}` : "Brera is calling",
        body: zone === "found" ? "Open the whisper to read its story." : (line || poi.name),
        tag: `whisper-${poi.id}`,
      });
    }
    // Persist server-side
    api.post("/me/discoveries", { poi_id: poi.id, zone })
      .catch((err) => console.warn("Discovery persist failed:", err));
    if (zone === "found") onFound?.(poi);
  }, [language, notificationsEnabled, onFound]);

  useEffect(() => {
    if (!enabled || !position || !pois || pois.length === 0) {
      setSightings([]);
      return;
    }
    const next = [];
    for (const poi of pois) {
      const distance = distanceMeters(position, poi);
      const zone = classifyZone(distance, radii);
      if (!zone) {
        // Falling out of all zones doesn't reset the persisted level.
        continue;
      }
      const bearing = bearingDeg(position, poi);
      next.push({ poi, distance, bearing, zone });
      const prev = stateRef.current.get(poi.id);
      if (!prev || ZONE_RANK[zone] > ZONE_RANK[prev]) {
        stateRef.current.set(poi.id, zone);
        trigger(poi, zone);
      }
    }
    // Sort: nearer first
    next.sort((a, b) => a.distance - b.distance);
    setSightings(next);
  }, [position, pois, enabled, radii, trigger]);

  return { sightings, radii };
}
