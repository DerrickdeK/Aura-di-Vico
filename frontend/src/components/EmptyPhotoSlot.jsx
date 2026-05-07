import React from "react";
import { Camera } from "lucide-react";

/**
 * EmptyPhotoSlot — elegant placeholder shown when a POI/landmark has no
 * real photo yet. Visually unmistakable as a deliberate "coming soon"
 * state (not a broken image), branded in terracotta + cream.
 *
 * Usage:
 *   {image_url ? <img src={image_url} /> : <EmptyPhotoSlot label={name} />}
 */
export default function EmptyPhotoSlot({
  label = "",
  language = "en",
  variant = "card",       // "card" | "hero" | "thumb"
  className = "",
  testId = "empty-photo-slot",
}) {
  const caption = language === "it" ? "Foto a venire" : "Photo coming soon";
  const dim = variant === "thumb" ? 18 : variant === "hero" ? 28 : 22;
  const initial = (label || "·").trim().charAt(0).toUpperCase();

  return (
    <div
      data-testid={testId}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(245, 240, 232, 0.95) 0%, rgba(229, 218, 198, 0.85) 100%)",
        color: "var(--terracotta)",
      }}
    >
      {/* Faint corner badge with the place's initial — feels considered, not empty */}
      <div
        className="absolute inset-0 flex items-center justify-center font-serif select-none"
        style={{
          fontSize: variant === "hero" ? "5rem" : variant === "thumb" ? "1.4rem" : "2.6rem",
          color: "rgba(189, 87, 69, 0.35)",
          fontWeight: 400,
        }}
        aria-hidden
      >
        {initial}
      </div>
      {/* Subtle "photo a venire" caption with camera glyph */}
      <div
        className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full"
        style={{
          background: "rgba(255, 248, 235, 0.85)",
          backdropFilter: "blur(4px)",
          color: "rgba(120, 110, 95, 0.92)",
          fontSize: variant === "thumb" ? 9 : 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          width: "fit-content",
          maxWidth: "calc(100% - 1rem)",
          margin: variant === "thumb" ? "0 auto" : undefined,
        }}
      >
        <Camera size={dim / 2} strokeWidth={1.6} />
        <span className="truncate">{caption}</span>
      </div>
    </div>
  );
}
