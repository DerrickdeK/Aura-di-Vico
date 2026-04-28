import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import useGeolocation from "../hooks/useGeolocation";
import useCityWhispers from "../hooks/useCityWhispers";
import ListeningCompass from "../components/ListeningCompass";
import WhisperCard from "../components/WhisperCard";
import POIDrawer from "../components/POIDrawer";
import { unlockAudio } from "../lib/audio";
import { t } from "../lib/i18n";

const BRERA_CENTER = { latitude: 45.4719, longitude: 9.1881 };

/** A scripted walk through Brera that visits a few POIs in sequence — used
 * when the device has no real GPS so the experience can be demoed indoors. */
const GHOST_WALK = [
  { latitude: 45.4719, longitude: 9.1881 }, // Orto Botanico vicinity
  { latitude: 45.4720, longitude: 9.1879 }, // Cortile della Pinacoteca
  { latitude: 45.4738, longitude: 9.1874 }, // Bar Jamaica
  { latitude: 45.4742, longitude: 9.1907 }, // Fioraio Bianchi
  { latitude: 45.4754, longitude: 9.1908 }, // Latteria di San Marco
  { latitude: 45.4736, longitude: 9.1908 }, // Cortile della Magnolia
];

function useGhostWalk(enabled) {
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0); // 0..1 between two waypoints
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= 1) {
          setIdx((i) => (i + 1) % GHOST_WALK.length);
          return 0;
        }
        return s + 0.04;
      });
    }, 350);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;
  const a = GHOST_WALK[idx];
  const b = GHOST_WALK[(idx + 1) % GHOST_WALK.length];
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * step,
    longitude: a.longitude + (b.longitude - a.longitude) * step,
  };
}

export default function ListenPage() {
  const { user } = useAuth();
  const { position: realPosition, error: geoError } = useGeolocation();

  const [pois, setPois] = useState([]);
  const [activePoi, setActivePoi] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [ghostOn, setGhostOn] = useState(false);

  const ghostPosition = useGhostWalk(ghostOn);
  const position = ghostOn ? ghostPosition : realPosition;

  const language = user?.language || "en";
  const interests = user?.interests || [];
  const notif = user?.notifications_enabled || false;

  // Filter POIs by user interests (empty interests => show all).
  const filteredPois = useMemo(() => {
    if (!interests || interests.length === 0) return pois;
    return pois.filter((p) =>
      !p.interest_tags || p.interest_tags.length === 0
        ? false
        : p.interest_tags.some((t) => interests.includes(t))
    );
  }, [pois, interests]);

  useEffect(() => {
    api.get("/pois").then(({ data }) => setPois(data)).catch(() => setPois([]));
  }, []);

  const { sightings, radii } = useCityWhispers({
    position,
    pois: filteredPois,
    language,
    notificationsEnabled: notif,
    enabled: audioOn,
    onFound: (poi) => {
      // Auto-open the drawer the moment a POI moves into the 'found' zone.
      setActivePoi(poi);
    },
  });

  // First user gesture on page unlocks the AudioContext.
  useEffect(() => {
    const onTouch = () => unlockAudio();
    window.addEventListener("pointerdown", onTouch, { once: true });
    return () => window.removeEventListener("pointerdown", onTouch);
  }, []);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;

  const headlineSighting = sightings[0] || null;

  return (
    <div className="min-h-screen pb-28 px-5 pt-12 max-w-xl mx-auto" data-testid="listen-page">
      <header className="text-center">
        <p className="eyebrow">Brera · Milano</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-none">
          {t(language, "listeningTitle")}
        </h1>
        <p className="mt-3 text-[var(--text-secondary)] max-w-sm mx-auto">
          {t(language, "listeningSubtitle")}
        </p>
      </header>

      <div className="mt-10 flex justify-center">
        <ListeningCompass
          sightings={sightings}
          sensedRadius={radii.sensed_radius_m}
          onSelectSighting={(s) => {
            // Reveal the POI for sighting in 'called' or 'found'. In 'sensed'
            // we keep the tease (no full info yet).
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              data-testid="silence-message"
            >
              {position
                ? t(language, "silenceCity")
                : (geoError
                  ? t(language, "silenceGeoOff")
                  : t(language, "silenceFix"))}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Compact controls — sit above the Emergent badge on small viewports */}
      <div className="fixed bottom-32 sm:bottom-24 left-0 right-0 z-[400] flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-2 bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] rounded-full px-3 py-2 shadow-md">
          <button
            onClick={() => setAudioOn((v) => !v)}
            className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
            data-testid="audio-toggle"
            aria-label="Toggle audio whispers"
          >
            {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{audioOn ? "Whispers on" : "Whispers off"}</span>
          </button>
          <span className="w-px h-4 bg-[var(--border)]" />
          <button
            onClick={() => setGhostOn((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 ${
              ghostOn ? "bg-[var(--terracotta)] text-[var(--inverse)]" : ""
            }`}
            data-testid="ghost-walk-toggle"
            title="Simulate a walk through Brera (for desktops without GPS)"
          >
            {ghostOn ? <Pause size={14} /> : <Play size={14} />}
            <Footprints size={14} />
            <span>{ghostOn ? "Walking…" : "Ghost walk"}</span>
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
