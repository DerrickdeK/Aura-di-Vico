import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Pause, Footprints } from "lucide-react";
import { useArea, pickLocale } from "../lib/area";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import { speak, stopSpeaking, isSpeechSupported, unlockSpeech } from "../lib/speech";

// Per-tenant localStorage key so each city's narrator is heard once per device.
function storageKey(slug) {
  return `aura-narrator-heard:${slug || "default"}`;
}

export default function CityNarrator() {
  const area = useArea();
  const { lang } = useLocale();
  const intro = pickLocale(area?.narrator?.intro || {}, lang);
  const areaLabel = pickLocale(area?.area, lang) || "";
  const brand = pickLocale(area?.brand, lang) || "";
  const ttsLang = lang === "it" ? "it-IT" : "en-US";

  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Fire once, after area + narrator are loaded, if we haven't heard it before.
  useEffect(() => {
    if (!area?.ready || !intro) return;
    const k = storageKey(area.slug);
    if (typeof window === "undefined") return;
    const heard = window.localStorage.getItem(k);
    if (!heard) {
      // Give the landing page a beat to render before revealing.
      const tid = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(tid);
    }
  }, [area?.ready, area?.slug, intro]);

  const dismiss = useCallback(() => {
    try { window.localStorage.setItem(storageKey(area?.slug), new Date().toISOString()); } catch (_) {}
    stopSpeaking();
    setSpeaking(false);
    setOpen(false);
  }, [area?.slug]);

  const handleHear = useCallback(() => {
    if (!intro || !isSpeechSupported()) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    unlockSpeech();
    setSpeaking(true);
    speak(intro, {
      lang: ttsLang,
      rate: 0.92,
      onEnd: () => setSpeaking(false),
    });
  }, [intro, speaking, ttsLang]);

  // Stop TTS on unmount.
  useEffect(() => () => stopSpeaking(), []);

  const paragraphs = useMemo(
    () => (intro || "").split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    [intro]
  );

  if (!intro) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="city-narrator-backdrop"
          data-testid="city-narrator-backdrop"
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: "rgba(26, 36, 48, 0.55)", backdropFilter: "blur(4px)" }}
          onClick={dismiss}
        >
          <motion.div
            key="city-narrator-sheet"
            data-testid="city-narrator-sheet"
            className="relative w-full sm:max-w-2xl sm:mx-6 max-h-[92vh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              boxShadow: "0 -20px 60px rgba(26, 36, 48, 0.35)",
            }}
          >
            {/* Decorative terracotta bar */}
            <div
              aria-hidden
              className="absolute left-0 top-0 h-full w-1.5"
              style={{ background: "var(--terracotta)" }}
            />

            <button
              type="button"
              aria-label="Close"
              data-testid="city-narrator-close-btn"
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg)] transition-colors"
            >
              <X size={18} style={{ color: "var(--text-secondary)" }} />
            </button>

            <div className="px-7 sm:px-12 pt-10 pb-8">
              <p
                className="eyebrow mb-4"
                style={{ color: "var(--terracotta)", letterSpacing: "0.14em", fontSize: 12, textTransform: "uppercase" }}
                data-testid="city-narrator-eyebrow"
              >
                {t(lang, "narrator.eyebrow", { area: areaLabel })}
              </p>
              <h2
                className="font-serif"
                style={{ fontSize: "1.9rem", lineHeight: 1.15, color: "var(--text-primary)", fontWeight: 400, marginBottom: 24 }}
                data-testid="city-narrator-title"
              >
                {brand}
              </h2>

              <div
                className="font-serif space-y-5"
                style={{ color: "var(--text-primary)", fontSize: "1.05rem", lineHeight: 1.65 }}
                data-testid="city-narrator-body"
              >
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {isSpeechSupported() && (
                  <button
                    type="button"
                    onClick={handleHear}
                    data-testid="city-narrator-hear-btn"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full transition-colors"
                    style={{
                      background: speaking ? "var(--deep-green)" : "var(--terracotta)",
                      color: "#fff",
                      fontSize: 14,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {speaking ? <Pause size={16} /> : <Volume2 size={16} />}
                    {speaking ? t(lang, "narrator.stop") : t(lang, "narrator.hear")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismiss}
                  data-testid="city-narrator-skip-btn"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full transition-colors"
                  style={{
                    background: "transparent",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    fontSize: 14,
                    letterSpacing: "0.04em",
                  }}
                >
                  <Footprints size={16} />
                  {t(lang, "narrator.next")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
