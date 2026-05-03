import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, MapPin, Lock } from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { devWarn } from "../lib/log";
import useGeolocation from "../hooks/useGeolocation";
import useNearestPoi from "../hooks/useNearestPoi";
import useProximityVibration from "../hooks/useProximityVibration";
import useAutoVisitRecording from "../hooks/useAutoVisitRecording";
import {
  FlyToUser,
  RecenterButton,
  UserMarker,
  POIMarkers,
  poiState,
} from "./MapWidgets";
import ProximityRadar from "./ProximityRadar";
import POIDrawer from "./POIDrawer";
import { useArea, pickLocale, getAreaCenter } from "../lib/area";
import useLocale from "../hooks/useLocale";

const DEFAULT_ZOOM = 16;

export default function MapView({ favorites, refreshFavorites }) {
  const { user } = useAuth();
  const isAuthed = !!user && user !== false;
  const area = useArea();
  const { lang } = useLocale();
  const areaLabel = [pickLocale(area.area, lang), pickLocale(area.city, lang)]
    .filter(Boolean)
    .join(" · ");

  const { position, error: geoError } = useGeolocation();
  const [pois, setPois] = useState([]);
  const [activePoi, setActivePoi] = useState(null);
  const [vibrationOn, setVibrationOn] = useState(true);

  useEffect(() => {
    api.get("/pois")
      .then(({ data }) => setPois(data))
      .catch((err) => {
        devWarn("Failed to load POIs:", err);
        setPois([]);
      });
  }, []);

  const nearest = useNearestPoi(position, pois);
  useProximityVibration(nearest, vibrationOn);
  const visitedIds = useAutoVisitRecording(nearest, isAuthed);

  const toggleFavorite = async (poi) => {
    if (!isAuthed) return;
    const isFav = favorites?.includes(poi.id);
    try {
      if (isFav) await api.delete(`/me/favorites/${poi.id}`);
      else await api.post(`/me/favorites/${poi.id}`);
      refreshFavorites?.();
    } catch (err) {
      devWarn("Favorite toggle failed:", err);
    }
  };

  const areaCenter = getAreaCenter();
  const areaMapCenter = area?.map?.center;
  const center = position
    ? [position.latitude, position.longitude]
    : (areaMapCenter && typeof areaMapCenter.lat === "number"
        ? [areaMapCenter.lat, areaMapCenter.lng]
        : [areaCenter.latitude, areaCenter.longitude]);
  const inRangePoi =
    nearest && poiState({ poi: nearest.poi, nearest, visitedIds }) === "inrange"
      ? nearest.poi
      : null;

  return (
    <div className="relative w-full h-full" data-testid="map-view">
      <MapContainer
        key={`${center[0]}-${center[1]}`}
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
        <FlyToUser position={position} />
        <UserMarker position={position} />
        <POIMarkers
          pois={pois}
          nearest={nearest}
          visitedIds={visitedIds}
          onSelect={setActivePoi}
        />
        <RecenterButton position={position} />
      </MapContainer>

      {/* Top label */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)]">
          <MapPin size={14} strokeWidth={1.5} className="text-[var(--terracotta)]" />
          <span className="eyebrow" data-testid="brera-label">{areaLabel || "—"}</span>
        </div>
      </div>

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

      {inRangePoi && (
        <motion.button
          onClick={() => setActivePoi(inRangePoi)}
          className="absolute left-4 right-4 bottom-24 z-[400] bg-[var(--terracotta)] text-[var(--inverse)] rounded-2xl px-5 py-4 shadow-xl text-left"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          data-testid="in-range-banner"
        >
          <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>You're here</div>
          <div className="font-serif text-2xl mt-0.5">{inRangePoi.name}</div>
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
