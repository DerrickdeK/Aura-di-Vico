import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";

import { auraIcon, userIcon } from "../lib/markers";
import { getAreaCenter } from "../lib/area";

// Build a divIcon coloured by proximity zone — the user can see at a glance
// which POIs are close (terracotta = called/found, ochre = sensed, dim = far).
const ZONE_FILL = {
  found: "#BD5745",
  called: "#C98A3C",
  sensed: "#1F4F5C",
  far: "rgba(120, 110, 95, 0.5)",
};

function zoneIcon(zone, isFound) {
  const fill = ZONE_FILL[zone] || ZONE_FILL.far;
  const ringSize = isFound ? 22 : 16;
  const halo = isFound
    ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:${fill};opacity:0.18;"></span>`
    : "";
  return L.divIcon({
    className: "walking-poi-icon",
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
    html: `<div style="position:relative;width:${ringSize}px;height:${ringSize}px;">
      ${halo}
      <span style="display:block;width:100%;height:100%;border-radius:50%;background:${fill};
                   border:2px solid #FFF8EB;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></span>
    </div>`,
  });
}

// Imperatively follow the user; auto-zoom on first fix, then preserve zoom.
function FollowUser({ position, follow }) {
  const map = useMap();
  const firstFixRef = useRef(true);
  useEffect(() => {
    if (!position || !follow) return;
    if (firstFixRef.current) {
      map.setView([position.latitude, position.longitude], 17, { animate: false });
      firstFixRef.current = false;
    } else {
      map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.6 });
    }
  }, [position, follow, map]);
  return null;
}

/**
 * WalkingMap — a compact tracking map for the Listen page.
 * Shows the user (pulsing terracotta dot) plus every POI they could reach,
 * dot-colour-coded by current proximity zone. Replaces the abstract
 * compass when the user prefers spatial wayfinding.
 */
export default function WalkingMap({
  position,
  sightings = [],
  pois = [],
  height = 280,
  follow = true,
  onSelectPoi,
}) {
  // Build a name → zone lookup so we can colour every POI dot in O(1).
  const zoneByPoi = useMemo(() => {
    const m = new Map();
    for (const s of sightings) {
      if (s?.poi?.id) m.set(s.poi.id, s.zone);
    }
    return m;
  }, [sightings]);

  const fallback = getAreaCenter();
  const center = position
    ? [position.latitude, position.longitude]
    : [fallback.latitude, fallback.longitude];

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ height, border: "1px solid var(--border)", boxShadow: "0 6px 20px rgba(26, 36, 48, 0.08)" }}
      data-testid="walking-map"
    >
      <MapContainer
        center={center}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <FollowUser position={position} follow={follow} />

        {/* Concentric proximity rings around the user (sensed/called/found) */}
        {position && (
          <>
            <Circle
              center={[position.latitude, position.longitude]}
              radius={200}
              pathOptions={{ color: "#1F4F5C", weight: 1, opacity: 0.25, fillOpacity: 0.04 }}
            />
            <Circle
              center={[position.latitude, position.longitude]}
              radius={80}
              pathOptions={{ color: "#C98A3C", weight: 1, opacity: 0.4, fillOpacity: 0.05 }}
            />
            <Circle
              center={[position.latitude, position.longitude]}
              radius={25}
              pathOptions={{ color: "#BD5745", weight: 1.5, opacity: 0.6, fillOpacity: 0.08 }}
            />
          </>
        )}

        {/* All POIs as little zone-coloured dots */}
        {pois.map((p) => {
          const zone = zoneByPoi.get(p.id) || "far";
          const isFound = zone === "found";
          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={zone === "far" ? auraIcon(p.id?.length || 1) : zoneIcon(zone, isFound)}
              eventHandlers={onSelectPoi ? { click: () => onSelectPoi(p) } : undefined}
            />
          );
        })}

        {/* User dot on top */}
        {position && (
          <Marker
            position={[position.latitude, position.longitude]}
            icon={userIcon()}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>
    </div>
  );
}
