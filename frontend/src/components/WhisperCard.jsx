import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { t, getOpeningLine, bearingLabel } from "../lib/i18n";

/**
 * Floating whisper card shown above the compass when a POI is in 'sensed' or
 * 'called' zone. 'sensed' is a tease (no name), 'called' reveals the name + opening line.
 */
export default function WhisperCard({ sighting, language = "en", onTap }) {
  if (!sighting) return null;
  const { poi, distance, bearing, zone } = sighting;
  const direction = bearingLabel(language, bearing);
  const dist = Math.round(distance);

  let title = "";
  let body = "";

  if (zone === "sensed") {
    title = "·";
    body = t(language, "sensedTease", { distance: dist, bearing: direction });
  } else if (zone === "called") {
    title = poi.name;
    body = getOpeningLine(poi, language) || poi.short_description;
  } else {
    title = poi.name;
    body = t(language, "youreHere");
  }

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={`${poi.id}-${zone}`}
        onClick={() => onTap?.(sighting)}
        className="block w-full max-w-md text-left bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 shadow-md"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45 }}
        data-testid={`whisper-card-${zone}`}
      >
        <div className="flex items-center gap-2 eyebrow" style={{ color: "var(--text-tertiary)" }}>
          <span>{t(language, `zones.${zone}`)}</span>
          <span>·</span>
          <span>{dist} m {direction}</span>
        </div>
        {zone !== "sensed" && (
          <div className="font-serif text-2xl mt-1 leading-tight">{title}</div>
        )}
        <p className="mt-1 text-[var(--text-primary)] leading-relaxed font-serif text-lg italic">
          {body}
        </p>
        {zone === "called" && (
          <div className="mt-2 text-xs text-[var(--terracotta)]">
            {t(language, "tapToReadStory")}
          </div>
        )}
      </motion.button>
    </AnimatePresence>
  );
}
