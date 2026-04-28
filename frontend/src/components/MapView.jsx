import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, MapPin, Crosshair, Lock } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { distanceMeters, bearingDeg, vibrate, vibrationPatternFor, stopVibration } from "../lib/geo";
import { poiIcon, userIcon } from "../lib/markers";
import ProximityRadar from "./ProximityRadar";
import POIDrawer from "./POIDrawer";

const BRERA_CENTER = { latitude: 45.4719, longitude: 9.1881 };
const DEFAULT_ZOOM = 16;
const VIBRATE_INTERVAL_MS = 1800; // re-trigger vibration every ~2s

function FlyToUser({ position }) {
  const map = useMap();
  const flownRef = useRef(false);
  useEffect(() => {
    if (position && !flownRef.current) {
      map.flyTo([position.latitude, position.longitude], 17, { duration: 1.2 });
      flownRef.current = true;
    }
  }, [position, map]);
  return null;
}

function RecenterButton({ position }) {
  const map = useMap();
  return (
    <button
      onClick={() => {
        if (position) map.flyTo([position.latitude, position.longitude], 17, { duration: 0.7 });
        else map.flyTo([BRERA_CENTER.latitude, BRERA_CENTER.longitude], DEFAULT_ZOOM);
      }}
      className="absolute top-4 right-4 z-[400] w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md flex items-center justify-center"
      data-testid="recenter-btn"
      aria-label="Recenter"
    >
      <Crosshair size={18} strokeWidth={1.6} />
    </button>
  );
}

export default function MapView({ favorites, refreshFavorites }) {
  const { user } = useAuth();
  const isAuthed = !!user && user !== false;

  const [pois, setPois] = useState([]);
  const [position, setPosition] = useState(null); // {latitude, longitude}
  const [geoError, setGeoError] = useState(null);
  const [activePoi, setActivePoi] = useState(null);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [visitedIds, setVisitedIds] = useState(new Set());
  const lastVibrateRef = useRef(0);

  // Load POIs
  useEffect(() => {
    api.get("/pois").then(({ data }) => setPois(data)).catch(() => setPois([]));
  }, []);

  // Watch geolocation
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by this device.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Compute nearest POI
  const nearest = useMemo(() => {
    if (!position || pois.length === 0) return null;
    let best = null;
    for (const p of pois) {
      const d = distanceMeters(position, p);
      if (!best || d < best.distance) {
        best = { poi: p, distance: d, bearing: bearingDeg(position, p) };
      }
    }
    return best;
  }, [position, pois]);

  // Vibration loop + auto-record visit when in range
  useEffect(() => {
    if (!nearest || !vibrationOn) {
      stopVibration();
      return;
    }
    const triggerR = nearest.poi.trigger_radius_m ?? 60;
    if (nearest.distance > triggerR * 4) {
      stopVibration();
      return;
    }
    const tick = () => {
      const now = Date.now();
      if (now - lastVibrateRef.current >= VIBRATE_INTERVAL_MS) {
        const pattern = vibrationPatternFor(nearest.distance, triggerR);
        if (pattern) vibrate(pattern);
        lastVibrateRef.current = now;
      }
    };
    tick();
    const id = setInterval(tick, 600);
    return () => clearInterval(id);
  }, [nearest, vibrationOn]);

  // Record visit when entering a POI's trigger radius (debounced via visitedIds)
  useEffect(() => {
    if (!nearest || !isAuthed) return;
    const r = nearest.poi.trigger_radius_m ?? 60;
    if (nearest.distance <= r && !visitedIds.has(nearest.poi.id)) {
      setVisitedIds((s) => new Set(s).add(nearest.poi.id));
      api.post("/me/visits", { poi_id: nearest.poi.id }).catch(() => {});
    }
  }, [nearest, isAuthed, visitedIds]);

  const toggleFavorite = async (poi) => {
    if (!isAuthed) return;
    const isFav = favorites?.includes(poi.id);
    try {
      if (isFav) await api.delete(`/me/favorites/${poi.id}`);
      else await api.post(`/me/favorites/${poi.id}`);
      refreshFavorites?.();
    } catch { /* ignore */ }
  };

  const center = position
    ? [position.latitude, position.longitude]
    : [BRERA_CENTER.latitude, BRERA_CENTER.longitude];

  return (
    <div className="relative w-full h-full" data-testid="map-view">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        className="absolute inset-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {position && (
          <>
            <FlyToUser position={position} />
            <Marker
              position={[position.latitude, position.longitude]}
              icon={userIcon()}
            />
          </>
        )}
        {pois.map((p) => {
          const inRange = nearest?.poi?.id === p.id && nearest.distance <= (p.trigger_radius_m ?? 60);
          const visited = visitedIds.has(p.id);
          const state = visited ? "visited" : inRange ? "inrange" : "undiscovered";
          return (
            <React.Fragment key={p.id}>
              <Marker
                position={[p.latitude, p.longitude]}
                icon={poiIcon(state)}
                eventHandlers={{ click: () => setActivePoi(p) }}
              />
              {inRange && (
                <Circle
                  center={[p.latitude, p.longitude]}
                  radius={p.trigger_radius_m ?? 60}
                  pathOptions={{ color: "#C98A3C", fillColor: "#C98A3C", fillOpacity: 0.08, weight: 1 }}
                />
              )}
            </React.Fragment>
          );
        })}
        <RecenterButton position={position} />
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)]">
          <MapPin size={14} strokeWidth={1.5} className="text-[var(--terracotta)]" />
          <span className="eyebrow" data-testid="brera-label">Brera · Milano</span>
        </div>
      </div>

      {/* Geo error banner */}
      <AnimatePresence>
        {geoError && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-20 z-[500] max-w-[90%]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            data-testid="geo-error"
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 shadow-md">
              <div className="flex items-start gap-3">
                <Lock size={16} className="mt-0.5 text-[var(--terracotta)]" strokeWidth={1.5} />
                <div className="text-sm">
                  <div className="font-medium">Location unavailable</div>
                  <div className="text-[var(--text-secondary)] mt-0.5">
                    Allow location to feel the vibrations and discover hidden spots around you. The map still works without it.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating proximity radar - bottom right */}
      <div className="absolute bottom-24 right-4 z-[400] pointer-events-auto">
        <ProximityRadar nearest={nearest} />
        <button
          onClick={() => setVibrationOn((v) => !v)}
          className="mt-2 w-full px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs flex items-center justify-center gap-1.5"
          data-testid="vibration-toggle"
        >
          <Navigation size={12} strokeWidth={1.6} />
          {vibrationOn ? "Vibration on" : "Vibration off"}
        </button>
      </div>

      {/* POI list bottom strip when no position OR as a quick browser */}
      {nearest?.poi && nearest.distance <= (nearest.poi.trigger_radius_m ?? 60) && (
        <motion.button
          onClick={() => setActivePoi(nearest.poi)}
          className="absolute left-4 right-4 bottom-24 z-[400] bg-[var(--terracotta)] text-[var(--inverse)] rounded-2xl px-5 py-4 shadow-xl text-left"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          data-testid="in-range-banner"
        >
          <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>You're here</div>
          <div className="font-serif text-2xl mt-0.5">{nearest.poi.name}</div>
          <div className="text-sm mt-1 opacity-90">Tap to read its story</div>
        </motion.button>
      )}

      <POIDrawer
        poi={activePoi}
        isFavorite={activePoi ? favorites?.includes(activePoi.id) : false}
        onClose={() => setActivePoi(null)}
        onToggleFavorite={() => activePoi && toggleFavorite(activePoi)}
        isAuthed={isAuthed}
      />
    </div>
  );
}
