import React from "react";

/**
 * Horizontal row of landmark thumbnail cards. Click a card → parent flies the
 * map to that landmark. Active card gets a terracotta border ring.
 */
export default function LandmarkThumbs({ landmarks, activeId, onSelect, lang = "it" }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5" data-testid="landmark-thumbs">
      {landmarks.map((l, i) => {
        const active = l.id === activeId;
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
            <div className="relative h-32 sm:h-36 overflow-hidden bg-[var(--bg)]">
              <img
                src={l.image}
                alt={l.name[lang] || l.name.en}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2 left-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--terracotta)] text-[var(--inverse)] text-xs font-serif font-bold shadow-md">
                {i + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pt-8 pb-2">
                <p className="font-serif text-white text-sm leading-tight drop-shadow">
                  {l.name[lang] || l.name.en}
                </p>
              </div>
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
