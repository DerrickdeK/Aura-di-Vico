import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { auraIcon, landmarkIcon } from "../lib/markers";
import { getAreaCenter } from "../lib/area";

function resolveCenter(centerProp) {
  if (centerProp && typeof centerProp.lat === "number") return [centerProp.lat, centerProp.lng];
  const c = getAreaCenter();
  return [c.latitude, c.longitude];
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 17.5, { duration: 0.9 });
  }, [target, map]);
  return null;
}

/**
 * Landing-page map: shows the anonymous "aura" dots for all hidden POIs and,
 * on top, numbered terracotta pins for a curated handful of famous landmarks.
 * Clicking a thumbnail (or a pin) flies the map to that landmark.
 */
export default function LandmarkMap({
  pois,
  landmarks,
  activeLandmarkId,
  onSelectLandmark,
  center,
  zoom = 16,
  height = 540,
}) {
  const active = landmarks.find((l) => l.id === activeLandmarkId);
  const target = active ? { lat: active.latitude, lng: active.longitude } : null;
  const resolved = resolveCenter(center);

  return (
    <MapContainer
      key={`${resolved[0]}-${resolved[1]}`}
      center={resolved}
      zoom={zoom}
      scrollWheelZoom={false}
      zoomControl={true}
      className="w-full"
      style={{ height, width: "100%" }}
      data-testid="landing-map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {pois.map((p, i) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={auraIcon(i)}
        />
      ))}
      {landmarks.map((l, i) => (
        <Marker
          key={l.id}
          position={[l.latitude, l.longitude]}
          icon={landmarkIcon(i + 1, l.image, l.id === activeLandmarkId)}
          eventHandlers={{ click: () => onSelectLandmark?.(l.id) }}
        />
      ))}
      <FlyTo target={target} />
    </MapContainer>
  );
}
