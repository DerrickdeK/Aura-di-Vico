import React from "react";

// Earthy gradient palette drawn from the app's CSS variables. Each landmark
// gets one slice — placeholders that look intentional until students replace
// them with their own photos.
const GRADIENTS = [
  { from: "#1E3A2F", to: "#2F5A47" }, // deep green / forest
  { from: "#BD5745", to: "#8E3F32" }, // terracotta / clay
  { from: "#C98A3C", to: "#8E5E1F" }, // warm ochre / mustard
  { from: "#3F4A66", to: "#2A334A" }, // slate twilight
  { from: "#7A4F2C", to: "#4F311A" }, // walnut / espresso
];

/**
 * Horizontal row of landmark thumbnail cards. Click a card → parent flies the
 * map to that landmark. Active card gets a terracotta border ring.
 */
export default function LandmarkThumbs({ landmarks, activeId, onSelect, lang = "it" }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5" data-testid="landmark-thumbs">
      {landmarks.map((l, i) => {
        const active = l.id === activeId;
        const grad = GRADIENTS[i % GRADIENTS.length];
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onSelect?.(l.id)}
            className={`group text-left rounded-2xl overflow-hidden border transition-all bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] ${
              active
                ? "border-[var(--terracotta)] shadow-md scale-[1.02]"
                : "border-[var(--border)] hover:border-[var(--terracotta)]/60 hover:shadow"
            }`}
            data-testid={`landmark-thumb-${l.id}`}
          >
            <div
              className="relative h-28 sm:h-32 overflow-hidden flex items-end p-3"
              style={{
                background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)`,
              }}
            >
              {/* Decorative arches/lines pattern */}
              <svg
                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0,80 Q25,60 50,80 T100,80" stroke="white" strokeWidth="0.6" fill="none" />
                <path d="M0,90 Q25,70 50,90 T100,90" stroke="white" strokeWidth="0.4" fill="none" />
                <circle cx="80" cy="25" r="14" stroke="white" strokeWidth="0.5" fill="none" />
                <circle cx="20" cy="35" r="8" stroke="white" strokeWidth="0.5" fill="none" />
              </svg>
              <span className="absolute top-2 left-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/95 text-[#1A1A18] text-xs font-serif font-bold shadow">
                {i + 1}
              </span>
              <p className="relative font-serif text-white text-base leading-tight drop-shadow-sm">
                {l.name[lang] || l.name.en}
              </p>
            </div>
            <div className="px-3 py-2.5 min-h-[3.5rem]">
              <p className="text-[12px] text-[var(--text-secondary)] leading-snug line-clamp-2">
                {l.note?.[lang] || l.note?.en}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
