import React, { useMemo } from "react";
import { motion } from "framer-motion";

// Map a sighting at distance d to a normalized radius (0=center, 1=edge of compass).
function normalize(distance, sensedRadius) {
  if (sensedRadius <= 0) return 1;
  return Math.max(0.1, Math.min(1, distance / sensedRadius));
}

const ZONE_COLOR = {
  sensed: "#1E3A2F",
  called: "#C98A3C",
  found:  "#BD5745",
};

/**
 * Atmospheric "compass" canvas. The user sits in the middle, breathing.
 * POIs that are sensing the user appear as glowing motes around the ring,
 * placed by bearing and distance. Tap a mote to open its drawer.
 */
export default function ListeningCompass({
  sightings = [],
  onSelectSighting,
  size = 320,
  sensedRadius = 200,
}) {
  const r = size / 2;
  const motes = useMemo(() => {
    return sightings.map((s) => {
      const dist = normalize(s.distance, sensedRadius);
      // bearing 0 = north (up). Convert to x/y. Rotate -90 because 0deg is east in math.
      const rad = ((s.bearing - 90) * Math.PI) / 180;
      // Place between 25% and 95% of the radius based on distance.
      const placement = 0.28 + dist * 0.65;
      return {
        ...s,
        x: r + Math.cos(rad) * r * placement,
        y: r + Math.sin(rad) * r * placement,
      };
    });
  }, [sightings, sensedRadius, r]);

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      data-testid="listening-compass"
    >
      {/* Concentric rings */}
      {[0.4, 0.7, 1].map((k, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            top: r - r * k,
            left: r - r * k,
            width: r * 2 * k,
            height: r * 2 * k,
            borderColor: "rgba(94, 90, 82, 0.18)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.15, duration: 0.6 }}
        />
      ))}

      {/* Cardinal labels */}
      {[
        { label: "N", x: r, y: 8, anchor: "middle" },
        { label: "S", x: r, y: size - 8, anchor: "middle" },
        { label: "E", x: size - 8, y: r + 4, anchor: "end" },
        { label: "W", x: 8, y: r + 4, anchor: "start" },
      ].map((c) => (
        <span
          key={c.label}
          className="absolute eyebrow"
          style={{
            top: c.y - 8,
            left: c.anchor === "middle" ? c.x - 6 : c.anchor === "end" ? c.x - 12 : c.x,
            color: "rgba(138,135,122,0.7)",
            fontSize: "0.65rem",
          }}
        >
          {c.label}
        </span>
      ))}

      {/* Pulsing center dot — the user */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: r - 9,
          left: r - 9,
          width: 18,
          height: 18,
          background: "var(--terracotta)",
          boxShadow: "0 0 0 6px rgba(189,87,69,0.18)",
        }}
        animate={{
          boxShadow: [
            "0 0 0 6px rgba(189,87,69,0.18)",
            "0 0 0 14px rgba(189,87,69,0.04)",
            "0 0 0 6px rgba(189,87,69,0.18)",
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      {/* POI motes */}
      {motes.map((m) => {
        const color = ZONE_COLOR[m.zone];
        return (
          <button
            key={m.poi.id}
            onClick={() => onSelectSighting?.(m)}
            className="absolute rounded-full"
            style={{
              top: m.y - 9,
              left: m.x - 9,
              width: 18,
              height: 18,
              background: color,
              border: "2px solid var(--bg)",
              boxShadow: `0 0 0 6px ${color}33`,
              cursor: "pointer",
            }}
            data-testid={`mote-${m.poi.id}`}
            aria-label={m.poi.name}
          >
            <motion.span
              className="absolute inset-[-6px] rounded-full"
              style={{ border: `1.5px solid ${color}` }}
              initial={{ opacity: 0.6, scale: 0.6 }}
              animate={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          </button>
        );
      })}
    </div>
  );
}
