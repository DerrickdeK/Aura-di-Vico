import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Footprints, MousePointer2, Play, ChevronRight, X } from "lucide-react";
import { userIcon } from "../lib/markers";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";

const BRERA_CENTER = [45.4719, 9.1881];

const MODE_KEYS = [
  { key: "auto", icon: Play },
  { key: "step", icon: ChevronRight },
  { key: "drag", icon: MousePointer2 },
];

function DragMarker({ position, onDrag }) {
  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={userIcon()}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng();
          onDrag(ll.lat, ll.lng);
        },
      }}
    />
  );
}

function MapClickToMove({ onMove }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e) => onMove(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, onMove]);
  return null;
}

export default function VirtualNavPanel({
  enabled,
  mode,
  onSetMode,
  onClose,
  onStep,
  position,
  onSetDragPosition,
}) {
  const { lang } = useLocale();
  if (!enabled) return null;

  const modeLabel = (k) => ({
    auto: t(lang, "listen.modeAuto"),
    step: t(lang, "listen.modeStep"),
    drag: t(lang, "listen.modeDrag"),
  }[k]);

  return (
    <div
      className="fixed bottom-44 sm:bottom-36 left-0 right-0 z-[450] flex justify-center px-4 pointer-events-none"
      data-testid="virtual-nav-panel"
    >
      <div className="pointer-events-auto w-full max-w-md bg-[var(--surface)]/95 backdrop-blur border border-[var(--border)] rounded-2xl p-3 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <p className="eyebrow">{t(lang, "listen.virtualWalkLabel")}</p>
          <button
            onClick={onClose}
            className="text-xs text-[var(--text-tertiary)] inline-flex items-center gap-1 hover:text-[var(--terracotta)]"
            data-testid="virtual-nav-close"
            aria-label="Stop virtual walk"
          >
            <X size={12} /> {t(lang, "listen.virtualStop")}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {MODE_KEYS.map((m) => {
            const Icon = m.icon;
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onSetMode(m.key)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-colors ${
                  active
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                    : "border-[var(--border)] bg-[var(--bg)]"
                }`}
                data-testid={`virtual-mode-${m.key}`}
              >
                <Icon size={14} strokeWidth={1.6} />
                <span>{modeLabel(m.key)}</span>
              </button>
            );
          })}
        </div>

        {mode === "auto" && (
          <p className="text-xs text-[var(--text-tertiary)] italic px-1 py-2 flex items-center gap-1.5">
            <Footprints size={12} /> {t(lang, "listen.autoHint")}
          </p>
        )}

        {mode === "step" && (
          <button
            onClick={onStep}
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
            data-testid="virtual-step-btn"
          >
            <ChevronRight size={16} /> {t(lang, "listen.stepBtn")}
          </button>
        )}

        {mode === "drag" && position && (
          <div className="rounded-xl overflow-hidden border border-[var(--border)] mt-1">
            <MapContainer
              center={[position.latitude, position.longitude]}
              zoom={16}
              scrollWheelZoom={false}
              zoomControl={true}
              className="h-44 w-full"
              style={{ height: 176, width: "100%" }}
              data-testid="virtual-drag-map"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OSM'
              />
              <DragMarker position={position} onDrag={onSetDragPosition} />
              <MapClickToMove onMove={onSetDragPosition} />
            </MapContainer>
            <p className="text-[10px] text-[var(--text-tertiary)] px-2 py-1 bg-[var(--bg)]">
              {t(lang, "listen.dragHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { BRERA_CENTER };
