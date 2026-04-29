import React from "react";
import { Marker, Circle, useMap } from "react-leaflet";
import { Crosshair } from "lucide-react";
import { poiIcon, userIcon } from "../lib/markers";

const IN_RANGE_CIRCLE_OPTIONS = {
  color: "#C98A3C",
  fillColor: "#C98A3C",
  fillOpacity: 0.08,
  weight: 1,
};

/** Recenters the map onto the user once, the first time we get a fix. */
export function FlyToUser({ position }) {
  const map = useMap();
  const flownRef = React.useRef(false);
  React.useEffect(() => {
    if (position && !flownRef.current) {
      map.flyTo([position.latitude, position.longitude], 17, { duration: 1.2 });
      flownRef.current = true;
    }
  }, [position, map]);
  return null;
}

const BRERA_CENTER = [45.4719, 9.1881];

export function RecenterButton({ position }) {
  const map = useMap();
  const onClick = () => {
    if (position) {
      map.flyTo([position.latitude, position.longitude], 17, { duration: 0.7 });
    } else {
      map.flyTo(BRERA_CENTER, 16);
    }
  };
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 z-[400] w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md flex items-center justify-center"
      data-testid="recenter-btn"
      aria-label="Recenter"
    >
      <Crosshair size={18} strokeWidth={1.6} />
    </button>
  );
}

export function UserMarker({ position }) {
  if (!position) return null;
  return <Marker position={[position.latitude, position.longitude]} icon={userIcon()} />;
}

/** Decide which marker style to use for a given POI. */
export function poiState({ poi, nearest, visitedIds }) {
  if (visitedIds.has(poi.id)) return "visited";
  const radius = poi.trigger_radius_m ?? 60;
  const isNearest = nearest?.poi?.id === poi.id;
  if (isNearest && nearest.distance <= radius) return "inrange";
  return "undiscovered";
}

export function POIMarkers({ pois, nearest, visitedIds, onSelect }) {
  return pois.map((p) => {
    const state = poiState({ poi: p, nearest, visitedIds });
    const inRange = state === "inrange";
    return (
      <React.Fragment key={p.id}>
        <Marker
          position={[p.latitude, p.longitude]}
          icon={poiIcon(state)}
          eventHandlers={{ click: () => onSelect(p) }}
        />
        {inRange && (
          <Circle
            center={[p.latitude, p.longitude]}
            radius={p.trigger_radius_m ?? 60}
            pathOptions={IN_RANGE_CIRCLE_OPTIONS}
          />
        )}
      </React.Fragment>
    );
  });
}
