import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { MapPin, Crosshair } from "lucide-react";
import { userIcon } from "../../lib/markers";

const BRERA_CENTER = [45.4719, 9.1881];

function ClickToPlace({ onPick }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e) => onPick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, onPick]);
  return null;
}

function FlyToOnAddress({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 18, { duration: 0.7 });
  }, [target, map]);
  return null;
}

/** Click-on-map picker. Drops a draggable marker at the clicked spot and
 * pushes the new (lat, lng) up to the parent form via `onChange`. Includes
 * a small "search address" box that uses OSM Nominatim (free, no key). */
export default function POICoordPicker({ latitude, longitude, address, onChange }) {
  const initial = (() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return [lat, lng];
    return BRERA_CENTER;
  })();

  const hasPin = Number.isFinite(parseFloat(latitude)) && Number.isFinite(parseFloat(longitude)) && (parseFloat(latitude) !== 0 || parseFloat(longitude) !== 0);

  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(address || "");
  const [searchTarget, setSearchTarget] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const place = (lat, lng) => onChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));

  const useDevicePosition = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place(pos.coords.latitude, pos.coords.longitude);
        setSearchTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => setSearchError(err.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const searchAddress = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true); setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const resp = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        place(lat, lng);
        setSearchTarget({ lat, lng });
      } else {
        setSearchError("No match — try adding the city name to the address.");
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
      <div className="flex flex-wrap items-stretch gap-2 p-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex flex-1 min-w-[200px] gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }}
            placeholder="Search address (e.g. street, city)"
            className="input-field text-sm flex-1"
            data-testid="poi-coord-search"
          />
          <button
            type="button"
            onClick={searchAddress}
            disabled={searching}
            className="btn-ghost text-xs inline-flex items-center gap-1"
            data-testid="poi-coord-search-btn"
          >
            <MapPin size={12} /> {searching ? "…" : "Find"}
          </button>
        </div>
        <button
          type="button"
          onClick={useDevicePosition}
          className="btn-ghost text-xs inline-flex items-center gap-1"
          title="Use this device's GPS position (must allow location)"
          data-testid="poi-coord-here"
        >
          <Crosshair size={12} /> I am here
        </button>
      </div>
      {searchError && (
        <p className="text-xs text-[var(--terracotta)] px-3 pt-2" data-testid="poi-coord-error">
          {searchError}
        </p>
      )}

      <MapContainer
        center={initial}
        zoom={hasPin ? 18 : 16}
        scrollWheelZoom={true}
        className="w-full"
        style={{ height: 320, width: "100%" }}
        data-testid="poi-coord-map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <ClickToPlace onPick={place} />
        <FlyToOnAddress target={searchTarget} />
        {hasPin && (
          <Marker
            position={[parseFloat(latitude), parseFloat(longitude)]}
            icon={userIcon()}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                place(ll.lat, ll.lng);
              },
            }}
          />
        )}
      </MapContainer>

      <p className="text-[11px] text-[var(--text-tertiary)] px-3 py-1.5 italic">
        Click anywhere on the map to drop the pin — drag it to fine-tune. The numbers below update automatically.
      </p>
    </div>
  );
}
