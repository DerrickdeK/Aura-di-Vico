import React from "react";
import { motion } from "framer-motion";

/**
 * ProximityRadar
 * Floating circular UI showing distance + bearing to nearest POI.
 *  - Color transitions cold (deep-green) -> hot (terracotta) as distance shrinks.
 *  - Pulsating rings whose speed depends on the proximity ratio.
 */
export default function ProximityRadar({ nearest }) {
  const distance = nearest?.distance;
  const bearing = nearest?.bearing ?? 0;
  const triggerRadius = nearest?.poi?.trigger_radius_m ?? 60;
  const inRange = distance != null && distance <= triggerRadius;

  // ratio: 0 (far) .. 1 (touching POI)
  const ratio = distance == null
    ? 0
    : Math.max(0, Math.min(1, 1 - distance / (triggerRadius * 4)));

  // Color blend cold -> hot
  const color = inRange ? "#BD5745" : ratio > 0.5 ? "#C98A3C" : "#1E3A2F";
  const labelColor = inRange ? "#BD5745" : "#1A1A18";

  const pulseDuration = 2.6 - ratio * 1.7; // 2.6s far -> 0.9s close

  return (
    <div
      className="pointer-events-none flex flex-col items-center"
      data-testid="proximity-radar"
    >
      <div className="relative w-[140px] h-[140px] flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: `1.5px solid ${color}` }}
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{ scale: [0.4, 1.05], opacity: [0.55, 0] }}
            transition={{
              duration: pulseDuration,
              repeat: Infinity,
              delay: (i * pulseDuration) / 3,
              ease: "easeOut",
            }}
          />
        ))}
        <div
          className="relative rounded-full bg-[var(--bg)]/90 border flex items-center justify-center"
          style={{ width: 96, height: 96, borderColor: color }}
        >
          {/* Bearing arrow */}
          {distance != null && (
            <div
              className="absolute"
              style={{ transform: `rotate(${bearing}deg)`, width: 96, height: 96 }}
            >
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: 6, color }}
              >
                <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                  <path d="M7 0 L14 18 L7 13 L0 18 Z" fill={color} />
                </svg>
              </div>
            </div>
          )}
          <div className="text-center px-2">
            <div
              className="font-serif font-medium text-2xl leading-none"
              style={{ color: labelColor }}
              data-testid="radar-distance"
            >
              {distance == null ? "—" : `${Math.round(distance)}`}
            </div>
            <div className="eyebrow mt-1" style={{ fontSize: "0.6rem" }}>
              {distance == null ? "scanning" : "meters"}
            </div>
          </div>
        </div>
      </div>
      {nearest?.poi && (
        <div
          className="mt-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-medium tracking-wide max-w-[180px] truncate text-center"
          style={{ color: labelColor }}
          data-testid="radar-poi-name"
        >
          {nearest.poi.name}
        </div>
      )}
    </div>
  );
}
