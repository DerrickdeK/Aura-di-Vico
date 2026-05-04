import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Volume2, VolumeX } from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import useGeolocation from "../hooks/useGeolocation";
import useCityWhispers from "../hooks/useCityWhispers";
import useGradientHaptic from "../hooks/useGradientHaptic";
import useVirtualPosition from "../hooks/useVirtualPosition";
import ListeningCompass from "../components/ListeningCompass";
import WhisperCard from "../components/WhisperCard";
import POIDrawer from "../components/POIDrawer";
import VirtualNavPanel from "../components/VirtualNavPanel";
import PocketModeChip from "../components/PocketModeChip";
import WalkingMap from "../components/WalkingMap";
import NearbyPoiStrip from "../components/NearbyPoiStrip";
import { unlockAudio } from "../lib/audio";
import { speak, stopSpeaking, unlockSpeech } from "../lib/speech";
import { t, getOpeningLine } from "../lib/i18n";
import { useArea, pickLocale } from "../lib/area";
import useLocale from "../hooks/useLocale";

// Module-level animation constants (avoid recreating per render).
const SILENCE_INITIAL = { opacity: 0 };
const SILENCE_ANIMATE = { opacity: 1 };

// Filter POIs by user themes (interests). Empty interests => no filter.
function filterByThemes(pois, interests) {
  if (!interests || interests.length === 0) return pois;
  return pois.filter((p) => {
    const tags = p.interest_tags || [];
    if (tags.length === 0) return true;  // untagged = visible to everyone
    return tags.some((tag) => interests.includes(tag));
  });
}

export default function ListenPage() {
  const { user } = useAuth();
  const { position: realPosition, error: geoError } = useGeolocation();
  const [searchParams] = useSearchParams();

  const [pois, setPois] = useState([]);
  const [activePoi, setActivePoi] = useState(null);
  const [audioOn, setAudioOn] = useState(true);

  // Virtual mode: triggered explicitly by user. ?virtual=1 query enables on load.
  const demoOn = searchParams.get("demo") === "1";
  const [virtualOn, setVirtualOn] = useState(searchParams.get("virtual") === "1" || demoOn);
  const [virtualMode, setVirtualMode] = useState("auto"); // "auto" | "step" | "drag"

  const language = user?.language || "en";
  const interests = user?.interests || [];
  const responseFormats = user?.response_formats || ["writing"];
  const voiceEnabled = responseFormats.includes("voice");
  const notif = user?.notifications_enabled || false;

  const themedPois = useMemo(() => filterByThemes(pois, interests), [pois, interests]);

  // Demo mode: lock the route to a curated 5-stop loop around Piazza Umberto.
  // Same UI surface (map + thumbnails + compass + drawer) but a pristine,
  // slow-paced auto-walk for showcase use.
  const DEMO_NAMES = [
    "Piazza Umberto I",
    "Hotel Aequa",
    "Tito's Ristorante",
    "Gelateria Gabriele",
    "Bar Centrale",
  ];
  const filteredPois = useMemo(() => {
    if (!demoOn) return themedPois;
    const byName = new Map(themedPois.map((p) => [p.name, p]));
    const ordered = DEMO_NAMES.map((n) => byName.get(n)).filter(Boolean);
    // Fall back to themed list if names changed and none match.
    return ordered.length ? ordered : themedPois;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themedPois, demoOn]);

  const { position: virtualPosition, stepForward, setDragPosition } = useVirtualPosition({
    enabled: virtualOn,
    mode: virtualMode,
    pois: filteredPois,
    slow: demoOn,
  });
  const position = virtualOn ? virtualPosition : realPosition;

  useEffect(() => {
    api.get("/pois").then(({ data }) => setPois(data)).catch(() => setPois([]));
  }, []);

  // Speak the opening line aloud when a POI enters the Called zone (only if
  // the user opted in to voice during onboarding/profile).
  const spokenIdsRef = useRef(new Set());
  const onWhisperEvent = (poi, zone) => {
    if (!voiceEnabled || !audioOn) return;
    if (zone !== "called" && zone !== "found") return;
    const key = `${poi.id}-${zone}`;
    if (spokenIdsRef.current.has(key)) return;
    spokenIdsRef.current.add(key);
    const line = getOpeningLine(poi, language);
    if (line) speak(line, { lang: language });
  };

  const { sightings, radii } = useCityWhispers({
    position,
    pois: filteredPois,
    language,
    notificationsEnabled: notif,
    enabled: audioOn,
    onZoneUpgrade: onWhisperEvent,
    onFound: (poi) => setActivePoi(poi),
  });

  // Continuous gradient haptic — independent of zone-entry signatures.
  const nearest = sightings[0] || null;
  useGradientHaptic({ nearest, enabled: audioOn });

  // First user gesture on page unlocks the AudioContext + Speech engine.
  useEffect(() => {
    const onTouch = () => { unlockAudio(); unlockSpeech(); };
    window.addEventListener("pointerdown", onTouch, { once: true });
    return () => window.removeEventListener("pointerdown", onTouch);
  }, []);

  // Stop any TTS when audio is turned off.
  useEffect(() => {
    if (!audioOn) stopSpeaking();
  }, [audioOn]);

  const { lang: uiLang } = useLocale();
  const area = useArea();
  const locationLabel = [pickLocale(area.area, uiLang), pickLocale(area.city, uiLang)]
    .filter(Boolean)
    .join(" · ");

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;

  const headlineSighting = sightings[0] || null;

  let silenceKey = "silenceFix";
  if (position) silenceKey = "silenceCity";
  else if (geoError) silenceKey = "silenceGeoOff";

  return (
    <div className="min-h-screen pb-28 px-5 pt-12 max-w-xl mx-auto" data-testid="listen-page">
      <PocketModeChip />
      {demoOn && (
        <div
          data-testid="demo-mode-banner"
          className="mb-4 flex items-center justify-center gap-2 mx-auto px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.18em]"
          style={{
            background: "var(--terracotta)",
            color: "#fff",
            width: "fit-content",
            boxShadow: "0 4px 12px rgba(189, 87, 69, 0.28)",
          }}
        >
          <span style={{ background: "#fff", width: 6, height: 6, borderRadius: "50%" }} />
          {language === "it" ? "Modalità Demo · Tour guidato" : "Demo mode · Guided tour"}
        </div>
      )}
      <header className="text-center">
        <p className="eyebrow">{locationLabel || "—"} {virtualOn && t(language, "listen.virtualBadge")}</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-none">
          {t(language, "listeningTitle")}
        </h1>
        <p className="mt-3 text-[var(--text-secondary)] max-w-sm mx-auto">
          {t(language, "listeningSubtitle")}
        </p>
      </header>

      <div className="mt-8">
        <WalkingMap
          position={position}
          sightings={sightings}
          pois={filteredPois}
          onSelectPoi={(p) => setActivePoi(p)}
          height={280}
        />
        <NearbyPoiStrip
          sightings={sightings}
          pois={filteredPois}
          language={language}
          hasPosition={!!position}
          onSelectPoi={(p) => setActivePoi(p)}
        />
      </div>

      <div className="mt-6 flex justify-center">
        <ListeningCompass
          sightings={sightings}
          sensedRadius={radii.sensed_radius_m}
          onSelectSighting={(s) => {
            if (s.zone !== "sensed") setActivePoi(s.poi);
          }}
        />
      </div>

      <div className="mt-8 min-h-[120px] flex items-start justify-center">
        <AnimatePresence>
          {headlineSighting ? (
            <WhisperCard
              key={headlineSighting.poi.id + headlineSighting.zone}
              sighting={headlineSighting}
              language={language}
              onTap={(s) => s.zone !== "sensed" && setActivePoi(s.poi)}
            />
          ) : (
            <motion.p
              key="silence"
              className="font-serif italic text-[var(--text-tertiary)] text-center max-w-sm"
              initial={SILENCE_INITIAL}
              animate={SILENCE_ANIMATE}
              data-testid="silence-message"
            >
              {t(language, silenceKey)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <VirtualNavPanel
        enabled={virtualOn}
        mode={virtualMode}
        onSetMode={setVirtualMode}
        onClose={() => setVirtualOn(false)}
        onStep={stepForward}
        position={virtualPosition}
        onSetDragPosition={setDragPosition}
      />

      <div className="fixed bottom-32 sm:bottom-24 left-0 right-0 z-[400] flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-2 bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] rounded-full px-3 py-2 shadow-md">
          <button
            onClick={() => setAudioOn((v) => !v)}
            className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
            data-testid="audio-toggle"
            aria-label="Toggle audio whispers"
          >
            {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{audioOn ? t(language, "listen.whispersOn") : t(language, "listen.whispersOff")}</span>
          </button>
          <span className="w-px h-4 bg-[var(--border)]" />
          <button
            onClick={() => setVirtualOn((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 ${
              virtualOn ? "bg-[var(--terracotta)] text-[var(--inverse)]" : ""
            }`}
            data-testid="virtual-walk-toggle"
            title={`Walk ${pickLocale(area.area, uiLang) || "the area"} virtually (no GPS needed)`}
          >
            <Footprints size={14} />
            <span>{virtualOn ? t(language, "listen.virtualOn") : t(language, "listen.virtualWalk")}</span>
          </button>
        </div>
      </div>

      <POIDrawer
        poi={activePoi}
        isFavorite={false}
        onClose={() => setActivePoi(null)}
        onToggleFavorite={() => {}}
        isAuthed={!!user}
      />
    </div>
  );
}
