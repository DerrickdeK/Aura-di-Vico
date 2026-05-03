import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { devWarn } from "../lib/log";
import { distanceMeters, bearingDeg, vibrate } from "../lib/geo";
import { playChime, CHIMES } from "../lib/audio";
import { showWhisperNotification } from "../lib/notifications";
import { getOpeningLine } from "../lib/i18n";
import { getAreaName } from "../lib/area";

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

function sightingsChanged(a, b) {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.poi.id !== y.poi.id ||
      x.zone !== y.zone ||
      Math.round(x.distance) !== Math.round(y.distance) ||
      Math.round(x.bearing) !== Math.round(y.bearing)
    ) {
      return true;
    }
  }
  return false;
}

export default function useCityWhispers({
  position,
  pois,
  language = "en",
  notificationsEnabled = false,
  enabled = true,
  onFound,
  onZoneUpgrade,
}) {
  const [radii, setRadii] = useState(DEFAULT_ZONES);
  const [sightings, setSightings] = useState([]);

  // Refs for the latest non-pure values so they don't re-trigger the effect.
  const onFoundRef = useRef(onFound);
  const onZoneUpgradeRef = useRef(onZoneUpgrade);
  const languageRef = useRef(language);
  const notifRef = useRef(notificationsEnabled);
  // Tracks the highest zone reached per POI in this session.
  const reachedRef = useRef(new Map());

  useEffect(() => { onFoundRef.current = onFound; }, [onFound]);
  useEffect(() => { onZoneUpgradeRef.current = onZoneUpgrade; }, [onZoneUpgrade]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { notifRef.current = notificationsEnabled; }, [notificationsEnabled]);

  // Load zone radii once.
  useEffect(() => {
    api.get("/config")
      .then(({ data }) => {
        if (!data?.zones) return;
        setRadii((prev) => {
          const z = data.zones;
          if (
            prev.sensed_radius_m === z.sensed_radius_m &&
            prev.called_radius_m === z.called_radius_m &&
            prev.found_radius_m === z.found_radius_m
          ) return prev;
          return z;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled || !position || !pois || pois.length === 0) {
      setSightings((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const next = [];
    for (const poi of pois) {
      const distance = distanceMeters(position, poi);
      const zone = classifyZone(distance, radii);
      if (!zone) continue;
      const bearing = bearingDeg(position, poi);
      next.push({ poi, distance, bearing, zone });

      const prevZone = reachedRef.current.get(poi.id);
      if (!prevZone || ZONE_RANK[zone] > ZONE_RANK[prevZone]) {
        reachedRef.current.set(poi.id, zone);
        // Side effects — fire ONCE per zone-upgrade.
        vibrate(PATTERNS[zone]);
        playChime(CHIMES[zone]);
        if (notifRef.current && (zone === "called" || zone === "found")) {
          const line = getOpeningLine(poi, languageRef.current);
          showWhisperNotification({
            title: zone === "found" ? `You found ${poi.name}` : `${getAreaName(languageRef.current) || "The city"} is calling`,
            body: zone === "found" ? "Open the whisper to read its story." : (line || poi.name),
            tag: `whisper-${poi.id}`,
          });
        }
        api.post("/me/discoveries", { poi_id: poi.id, zone })
          .catch((err) => devWarn("Discovery persist failed:", err));
        onZoneUpgradeRef.current?.(poi, zone);
        if (zone === "found") onFoundRef.current?.(poi);
      }
    }
    next.sort((a, b) => a.distance - b.distance);
    setSightings((prev) => (sightingsChanged(prev, next) ? next : prev));
  }, [position, pois, enabled, radii]);

  return { sightings, radii };
}
