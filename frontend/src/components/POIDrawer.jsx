import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MapPin, Clock, Sparkles, BookOpen, MessageCircle, Image as ImageIcon } from "lucide-react";
import { api } from "../lib/api";
import { devWarn } from "../lib/log";
import EmptyPhotoSlot from "./EmptyPhotoSlot";
import { uploadPoiImage } from "../lib/uploads";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import POIChatPanel, { POIChatLauncher } from "./POIChatPanel";

const TYPE_ICONS = {
  narrative: BookOpen,
  dialogue_prompt: MessageCircle,
  fun_fact: Sparkles,
  photo_url: ImageIcon,
};

function ContributionItem({ c }) {
  const Icon = TYPE_ICONS[c.type] || BookOpen;
  if (c.type === "photo_url") {
    return (
      <div className="rounded-xl overflow-hidden border border-[var(--border)]" data-testid={`drawer-contribution-${c.id}`}>
        <img src={c.content} alt={c.title || "Contributor photo"}
             className="w-full h-44 object-cover"
             onError={(e) => { e.currentTarget.style.display = "none"; }} />
        {(c.title || c.user_name) && (
          <p className="p-2 text-xs text-[var(--text-tertiary)]">
            {c.title || c.user_name}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg)]" data-testid={`drawer-contribution-${c.id}`}>
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] uppercase tracking-widest">
        <Icon size={12} /> <span>{c.type.replace("_", " ")}</span>
        {c.user_name && <span className="ml-auto normal-case tracking-normal italic">— {c.user_name}</span>}
      </div>
      {c.title && <p className="font-serif text-base mt-1.5">{c.title}</p>}
      <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{c.content}</p>
    </div>
  );
}

const BACKDROP_INITIAL = { opacity: 0 };
const BACKDROP_ANIMATE = { opacity: 1 };
const BACKDROP_EXIT = { opacity: 0 };

const DRAWER_INITIAL = { y: "100%" };
const DRAWER_ANIMATE = { y: 0 };
const DRAWER_EXIT = { y: "100%" };
const DRAWER_TRANSITION = { type: "spring", damping: 28, stiffness: 260 };

export default function POIDrawer({ poi, isFavorite, onClose, onToggleFavorite, isAuthed, canEditPhoto = false, onPhotoUpdated }) {
  const [contributions, setContributions] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(poi?.image_url || "");
  const { lang } = useLocale();

  // Reset local image whenever a new poi opens.
  useEffect(() => { setLocalImageUrl(poi?.image_url || ""); }, [poi?.id, poi?.image_url]);

  useEffect(() => {
    setChatOpen(false);  // collapse the chat each time the drawer opens with a new POI
    if (!poi) {
      setContributions([]);
      return;
    }
    api.get(`/pois/${poi.id}/contributions`)
      .then(({ data }) => setContributions(data))
      .catch((err) => { devWarn("Failed to load contributions:", err); setContributions([]); });
  }, [poi?.id]);

  return (
    <AnimatePresence>
      {poi && (
        <>
          <motion.div
            className="fixed inset-0 bg-[#1A1A18]/30 z-[1000]"
            initial={BACKDROP_INITIAL}
            animate={BACKDROP_ANIMATE}
            exit={BACKDROP_EXIT}
            onClick={onClose}
            data-testid="poi-drawer-backdrop"
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[1001] bg-[var(--surface)] rounded-t-3xl border-t border-[var(--border)] drawer-content max-h-[88vh] overflow-y-auto"
            initial={DRAWER_INITIAL}
            animate={DRAWER_ANIMATE}
            exit={DRAWER_EXIT}
            transition={DRAWER_TRANSITION}
            data-testid="poi-drawer"
          >
            <div className="flex justify-center pt-3">
              <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
            </div>
            <div className="relative">
              {localImageUrl ? (
                <img
                  src={localImageUrl}
                  alt={poi.name}
                  className="w-full h-56 object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-56">
                  <EmptyPhotoSlot
                    label={poi.name}
                    language={lang}
                    variant="hero"
                    testId={`empty-photo-poi-${poi.id}`}
                    onUpload={canEditPhoto ? async (file) => {
                      const url = await uploadPoiImage(poi.id, file);
                      setLocalImageUrl(url);
                      if (typeof onPhotoUpdated === "function") onPhotoUpdated(poi.id, url);
                    } : undefined}
                  />
                </div>
              )}
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
                {!chatOpen && <POIChatLauncher onOpen={() => setChatOpen(true)} />}
              </div>

              {chatOpen && (
                <POIChatPanel poi={poi} onClose={() => setChatOpen(false)} />
              )}

              {contributions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--border)]" data-testid="poi-drawer-contributions">
                  <p className="font-serif text-xl text-[var(--text-primary)] leading-snug">
                    {t(lang, "contribute.drawerTitle")}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {t(lang, contributions.length === 1 ? "contribute.drawerCount" : "contribute.drawerCountPlural", { n: contributions.length })}
                  </p>
                  <div className="mt-3 space-y-3">
                    {contributions.map((c) => <ContributionItem key={c.id} c={c} />)}
                  </div>
                </div>
              )}

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
