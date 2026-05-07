import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { pickLocale } from "../lib/area";
import EmptyPhotoSlot from "./EmptyPhotoSlot";

const ZONE_DOT = {
  found: "#BD5745",
  called: "#C98A3C",
  sensed: "#1F4F5C",
  far: "rgba(120, 110, 95, 0.55)",
};

function formatDistance(d) {
  if (typeof d !== "number") return "";
  if (d < 1000) return `${Math.round(d)} m`;
  return `${(d / 1000).toFixed(1)} km`;
}

/**
 * NearbyPoiStrip — horizontal photo-thumbnail strip of the nearest POIs.
 * Sits under the walking map on /listen. When the user has GPS we show
 * proximity-sorted sightings with distance chips; without GPS we show
 * the curated POI list so the page never feels empty.
 *
 * Tapping a card opens that POI's full story drawer (same handler as the
 * map markers).
 */
export default function NearbyPoiStrip({
  sightings = [],
  pois = [],
  language = "en",
  onSelectPoi,
  hasPosition = false,
  limit = 8,
}) {
  const cards = useMemo(() => {
    if (hasPosition && sightings.length) {
      return sightings.slice(0, limit).map((s) => ({
        poi: s.poi,
        distance: s.distance,
        zone: s.zone,
      }));
    }
    return pois.slice(0, limit).map((p) => ({ poi: p, distance: null, zone: "far" }));
  }, [hasPosition, sightings, pois, limit]);

  if (!cards.length) return null;

  return (
    <div className="mt-4" data-testid="nearby-poi-strip">
      <div
        className="flex gap-3 overflow-x-auto pb-3 px-1 -mx-1 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        {cards.map(({ poi, distance, zone }, i) => {
          const name = pickLocale(poi.name, language) || poi.name;
          const dot = ZONE_DOT[zone] || ZONE_DOT.far;
          const photo = poi.image_url || "";
          return (
            <motion.button
              key={poi.id || i}
              type="button"
              onClick={() => onSelectPoi?.(poi)}
              data-testid={`nearby-poi-card-${poi.id || i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="relative flex-shrink-0 w-[140px] sm:w-[160px] snap-start text-left rounded-xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: zone === "found" ? "0 4px 16px rgba(189, 87, 69, 0.3)" : "0 2px 8px rgba(26, 36, 48, 0.08)",
              }}
            >
              <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: "var(--bg)" }}>
                {photo ? (
                  <img
                    src={photo}
                    alt={name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <EmptyPhotoSlot label={name} language={language} variant="thumb" testId={`empty-photo-${poi.id || i}`} />
                )}
                {/* Zone tag — only when GPS gives us proximity info */}
                {distance != null && (
                  <div
                    className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255, 248, 235, 0.94)", backdropFilter: "blur(6px)" }}
                  >
                    <span
                      className="block w-2 h-2 rounded-full"
                      style={{ background: dot }}
                    />
                    <span
                      className="text-[10px] font-medium tracking-wide"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatDistance(distance)}
                    </span>
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p
                  className="font-serif text-sm leading-tight line-clamp-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {name}
                </p>
                {poi.category && (
                  <p
                    className="mt-1 text-[10px] uppercase tracking-[0.12em] truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {poi.category}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
