import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ear, Footprints, Sparkles, ArrowRight, ShieldCheck, PenLine, Gift } from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useArea, pickLocale } from "../lib/area";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LandmarkMap from "../components/LandmarkMap";
import LandmarkThumbs from "../components/LandmarkThumbs";
import LandmarkDetail from "../components/LandmarkDetail";

// Well-known area anchors come from /api/area — one config file controls
// which landmarks appear on the landing page for any city/campus. Images
// are served through the wsrv.nl free caching proxy for CORS-friendly delivery.
const IMG_PROXY = "https://wsrv.nl/?w=600&h=600&fit=cover&output=jpg&url=";

function buildLandmark(lm) {
  // Shape a config landmark dict into what LandmarkMap/Thumbs/Detail expect.
  const image = lm.image_wikimedia
    ? `${IMG_PROXY}${lm.image_wikimedia}`
    : (lm.image_url || "");
  return {
    id: lm.id,
    name: lm.name,
    note: lm.note,
    intro: lm.intro,
    voice: lm.voice,
    latitude: lm.latitude,
    longitude: lm.longitude,
    image,
  };
}

export default function LandingPage() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const area = useArea();
  const [pois, setPois] = useState([]);
  const [activeLandmark, setActiveLandmark] = useState(null);
  const isAuthed = !!user && user !== false;
  const isAdmin = isAuthed && user.role === "admin";
  const landmarks = (area.landmarks || []).map(buildLandmark);
  const brand = pickLocale(area.brand, lang) || "Aura";

  useEffect(() => {
    api.get("/pois").then(({ data }) => setPois(data)).catch(() => setPois([]));
  }, []);

  const HOW_CARDS = [
    { key: "sensed", color: "var(--deep-green)" },
    { key: "called", color: "var(--warm-ochre)" },
    { key: "found",  color: "var(--terracotta)" },
  ];

  return (
    <div className="min-h-screen pb-24" data-testid="landing-page">
      {/* Top bar */}
      <header className="px-5 sm:px-10 pt-6 flex items-center justify-between gap-3">
        <div className="font-serif text-2xl tracking-tight" data-testid="landing-brand">{brand}</div>
        <nav className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-[var(--terracotta)]"
              data-testid="landing-admin-link"
            >
              <ShieldCheck size={14} /> {t(lang, "landing.adminLink")}
            </Link>
          )}
          {isAuthed ? (
            <Link to="/listen" className="btn-primary" data-testid="landing-continue">
              {t(lang, "landing.continueListening")} <ArrowRight size={14} className="inline ml-1" />
            </Link>
          ) : (
            <Link to="/login" className="btn-ghost" data-testid="landing-signin">
              {t(lang, "landing.signIn")}
            </Link>
          )}
        </nav>
      </header>

      {/* Hero — compact text intro */}
      <section className="px-5 sm:px-10 mt-8 sm:mt-12 max-w-5xl mx-auto">
        <p className="eyebrow">{t(lang, "landing.eyebrow")}</p>
        <h1 className="font-serif text-4xl sm:text-6xl mt-3 leading-[0.98] max-w-3xl">
          {t(lang, "landing.heroPart1")} <em className="text-[var(--terracotta)] not-italic">{t(lang, "landing.heroPart2")}</em>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          {t(lang, "landing.heroIntro")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {!isAuthed && (
            <Link to="/register" className="btn-primary inline-flex items-center gap-2" data-testid="landing-begin">
              <Ear size={16} /> {t(lang, "landing.begin")}
            </Link>
          )}
          <Link
            to={isAuthed ? "/listen?virtual=1" : "/login?next=/listen?virtual=1"}
            className="btn-ghost inline-flex items-center gap-2"
            data-testid="landing-try-ghost"
          >
            <Footprints size={16} /> {t(lang, "landing.tryGhost")}
          </Link>
          {isAuthed && (
            <Link
              to="/gift/new"
              className="btn-ghost inline-flex items-center gap-2"
              data-testid="landing-gift-cta"
            >
              <Gift size={16} /> {t(lang, "landing.giftCta")}
            </Link>
          )}
        </div>
      </section>

      {/* Larger map + landmark thumbnails */}
      <section className="px-5 sm:px-10 mt-10 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="eyebrow">{t(lang, "landing.shape")}</p>
            <h2 className="font-serif text-2xl sm:text-3xl mt-1">
              {pois.length > 0
                ? t(lang, "landing.pulsing", { count: pois.length })
                : t(lang, "landing.breraIs")}
            </h2>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] hidden sm:block">
            {t(lang, "landing.hint")}
          </p>
        </div>
        <div className="rounded-3xl overflow-hidden border border-[var(--border)] shadow-md">
          {area.ready ? (
            <LandmarkMap
              pois={pois}
              landmarks={landmarks}
              activeLandmarkId={activeLandmark}
              onSelectLandmark={setActiveLandmark}
              center={area.map?.center}
              zoom={area.map?.landing_zoom || 14}
              height={560}
            />
          ) : (
            <div style={{ height: 560 }} className="flex items-center justify-center text-[var(--text-tertiary)] text-sm bg-[var(--map-water)]">
              Loading map…
            </div>
          )}
        </div>

        {landmarks.length > 0 && (
          <>
            <div className="mt-7 flex items-end justify-between flex-wrap gap-2">
              <div>
                <p className="eyebrow">{t(lang, "landing.famousLandmarksEyebrow")}</p>
                <h3 className="font-serif text-xl sm:text-2xl mt-1">
                  {t(lang, "landing.famousLandmarksTitle")}
                </h3>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t(lang, "landing.famousLandmarksHint")}
              </p>
            </div>

            <LandmarkThumbs
              landmarks={landmarks}
              activeId={activeLandmark}
              onSelect={(id) => setActiveLandmark((curr) => (curr === id ? null : id))}
              lang={lang}
            />

            <LandmarkDetail
              landmark={landmarks.find((l) => l.id === activeLandmark)}
              lang={lang}
              onClose={() => setActiveLandmark(null)}
            />
          </>
        )}

        {/* Reciprocity line — discreet, italic. The two essential ideas:
            (a) the place speaks; (b) walking here is a relationship. */}
        <p className="mt-6 text-center text-[var(--text-tertiary)] italic font-serif max-w-2xl mx-auto leading-relaxed">
          {t(lang, "landing.reciprocityLine")}
        </p>
      </section>

      {/* How it works */}
      <section className="px-5 sm:px-10 mt-16 max-w-6xl mx-auto">
        <p className="eyebrow text-center">{t(lang, "landing.howTitle")}</p>
        <h2 className="font-serif text-3xl text-center mt-2">{t(lang, "landing.howSubtitle")}</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-5">
          {HOW_CARDS.map((c, i) => (
            <motion.div
              key={c.key}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              data-testid={`landing-howcard-${c.key}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: c.color }}
                />
                <p className="eyebrow">{t(lang, `landing.${c.key}Label`)}</p>
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">{t(lang, `landing.${c.key}Range`)}</span>
              </div>
              <p className="mt-3 font-serif italic text-lg leading-snug text-[var(--text-primary)]">
                {t(lang, `landing.${c.key}Text`)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-5 sm:px-10 mt-20 max-w-4xl mx-auto text-center">
        <Sparkles size={28} strokeWidth={1.2} className="mx-auto text-[var(--warm-ochre)]" />
        <h2 className="font-serif text-4xl mt-3 leading-tight">
          {t(lang, "landing.footerCtaTitle")}<br />
          {t(lang, "landing.footerCtaTitle2")}
        </h2>
        <p className="mt-3 text-[var(--text-secondary)] max-w-xl mx-auto">
          {t(lang, "landing.footerCtaText")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {!isAuthed ? (
            <>
              <Link to="/register" className="btn-primary" data-testid="landing-footer-begin">
                {t(lang, "landing.begin")}
              </Link>
              <Link to="/login" className="btn-ghost" data-testid="landing-footer-signin">
                {t(lang, "landing.signIn")}
              </Link>
            </>
          ) : (
            <Link to="/listen" className="btn-primary" data-testid="landing-footer-continue">
              {t(lang, "landing.continueListening")}
            </Link>
          )}
        </div>
        <p className="mt-10 text-xs text-[var(--text-tertiary)] tracking-widest uppercase">
          {t(lang, "landing.footerNote")}
        </p>
      </section>

      {/* Reciprocity / weaving — the second core idea: voices intertwine */}
      <section className="px-5 sm:px-10 mt-20 max-w-3xl mx-auto text-center" data-testid="landing-weaving">
        <p className="eyebrow">{t(lang, "landing.weavingEyebrow")}</p>
        <h2 className="font-serif text-3xl sm:text-4xl mt-2 leading-tight">
          {t(lang, "landing.weavingTitle")}
        </h2>
        <p className="mt-4 text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto">
          {t(lang, "landing.weavingBody")}
        </p>
      </section>

      {/* Contributor invite */}
      <section className="px-5 sm:px-10 mt-16 max-w-3xl mx-auto" data-testid="landing-contributor-section">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 text-center">
          <PenLine size={24} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
          <h3 className="font-serif text-2xl mt-3">{t(lang, "landing.contributorTitle")}</h3>
          <p className="mt-2 text-[var(--text-secondary)] max-w-lg mx-auto">
            {t(lang, "landing.contributorText")}
          </p>
          <Link
            to="/register?role=contributor"
            className="btn-primary inline-flex items-center gap-2 mt-5"
            data-testid="landing-contributor-cta"
          >
            <PenLine size={14} /> {t(lang, "landing.contributorCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
