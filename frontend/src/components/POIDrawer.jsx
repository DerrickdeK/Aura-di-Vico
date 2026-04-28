import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MapPin, Clock, Sparkles } from "lucide-react";

export default function POIDrawer({ poi, isFavorite, onClose, onToggleFavorite, isAuthed }) {
  return (
    <AnimatePresence>
      {poi && (
        <>
          <motion.div
            className="fixed inset-0 bg-[#1A1A18]/30 z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="poi-drawer-backdrop"
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[1001] bg-[var(--surface)] rounded-t-3xl border-t border-[var(--border)] drawer-content max-h-[88vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            data-testid="poi-drawer"
          >
            <div className="flex justify-center pt-3">
              <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
            </div>
            <div className="relative">
              <img
                src={poi.image_url}
                alt={poi.name}
                className="w-full h-56 object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[var(--bg)]/90 backdrop-blur flex items-center justify-center"
                data-testid="poi-drawer-close"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[var(--text-primary)]/85 text-[var(--inverse)] backdrop-blur text-xs font-medium tracking-widest uppercase">
                {poi.category}
              </div>
            </div>
            <div className="p-6 pb-12">
              <h2 className="font-serif text-3xl leading-tight" data-testid="poi-drawer-name">
                {poi.name}
              </h2>
              <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
                {poi.short_description}
              </p>

              <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                <div className="flex items-start gap-3">
                  <MapPin size={16} strokeWidth={1.5} className="mt-0.5 text-[var(--terracotta)]" />
                  <span>{poi.address}</span>
                </div>
                {poi.hours && (
                  <div className="flex items-start gap-3">
                    <Clock size={16} strokeWidth={1.5} className="mt-0.5 text-[var(--terracotta)]" />
                    <span>{poi.hours}</span>
                  </div>
                )}
                {poi.fun_fact && (
                  <div className="flex items-start gap-3">
                    <Sparkles size={16} strokeWidth={1.5} className="mt-0.5 text-[var(--warm-ochre)]" />
                    <span className="font-script text-base text-[var(--text-primary)]">
                      {poi.fun_fact}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <p className="font-serif text-xl text-[var(--text-primary)] leading-snug">
                  The story
                </p>
                <p className="mt-2 text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                  {poi.long_description}
                </p>
              </div>

              {isAuthed && (
                <button
                  onClick={onToggleFavorite}
                  className="mt-6 w-full btn-ghost flex items-center justify-center gap-2"
                  data-testid="poi-drawer-favorite-btn"
                >
                  <Heart
                    size={16}
                    strokeWidth={1.5}
                    fill={isFavorite ? "var(--terracotta)" : "transparent"}
                    color={isFavorite ? "var(--terracotta)" : "currentColor"}
                  />
                  {isFavorite ? "Saved to your favorites" : "Save to favorites"}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
