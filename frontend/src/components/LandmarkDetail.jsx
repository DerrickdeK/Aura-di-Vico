import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Quote, MessageCircle } from "lucide-react";
import POIChatPanel from "./POIChatPanel";
import useLocale from "../hooks/useLocale";

const CTA = {
  it: "Parla con questo luogo",
  en: "Talk with this place",
};

/**
 * Inline detail panel that appears below the landmark thumbnails when one is
 * selected. Designed to deliver TWO ideas to first-time visitors:
 *   1) The place itself is speaking — the "voice" line is rendered as a
 *      first-person whisper in serif italic.
 *   2) Walking here is a relationship — the closing copy gently signals
 *      reciprocity (the city listens too).
 */
export default function LandmarkDetail({ landmark, lang, onClose }) {
  const { lang: ctxLang } = useLocale();
  const [chatOpen, setChatOpen] = useState(false);

  // Reset chat panel when the selected landmark changes
  React.useEffect(() => { setChatOpen(false); }, [landmark?.id]);

  return (
    <AnimatePresence>
      {landmark && (
        <motion.div
          key={landmark.id}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0,  height: "auto" }}
          exit={{    opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden"
          data-testid="landmark-detail"
        >
          <article className="mt-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-md">
            <div className="grid sm:grid-cols-[260px_1fr]">
              <div className="relative h-40 sm:h-auto bg-[var(--bg)]">
                <img
                  src={landmark.image}
                  alt={landmark.name[lang] || landmark.name.en}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5 sm:p-6 relative">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full inline-flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg)] hover:text-[var(--terracotta)]"
                  aria-label="close"
                  data-testid="landmark-detail-close"
                >
                  <X size={14} />
                </button>

                <p className="eyebrow">{landmark.note?.[lang] || landmark.note?.en}</p>
                <h3 className="font-serif text-2xl sm:text-3xl mt-1 leading-tight pr-8">
                  {landmark.name[lang] || landmark.name.en}
                </h3>

                {/* The "voice" — the place speaking in first person */}
                <blockquote className="mt-4 pl-4 border-l-2 border-[var(--terracotta)] italic font-serif text-[var(--text-primary)] leading-snug">
                  <Quote size={14} className="inline -mt-3 mr-1 text-[var(--terracotta)]" strokeWidth={1.4} />
                  {landmark.voice?.[lang] || landmark.voice?.en}
                </blockquote>

                {/* The richer description */}
                <p className="mt-3 text-[var(--text-secondary)] leading-relaxed text-[15px]">
                  {landmark.intro?.[lang] || landmark.intro?.en}
                </p>

                {!chatOpen && (
                  <button
                    onClick={() => setChatOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--terracotta)] text-[var(--terracotta)] bg-[var(--terracotta)]/5 hover:bg-[var(--terracotta)] hover:text-[var(--inverse)] transition-colors text-sm font-medium"
                    data-testid="landmark-chat-launch"
                  >
                    <MessageCircle size={14} /> {CTA[ctxLang] || CTA.en}
                  </button>
                )}
              </div>
            </div>

            {chatOpen && (
              <div className="border-t border-[var(--border)] px-5 sm:px-6 pb-5 sm:pb-6 -mt-2">
                <POIChatPanel
                  poi={{
                    id: landmark.id,
                    name: landmark.name[ctxLang] || landmark.name.en,
                    opening_line: landmark.voice,
                  }}
                  endpoint={`/landmarks/${landmark.id}/chat`}
                  onClose={() => setChatOpen(false)}
                />
              </div>
            )}
          </article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
