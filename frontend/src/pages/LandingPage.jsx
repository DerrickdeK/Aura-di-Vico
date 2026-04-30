import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { motion } from "framer-motion";
import { Ear, Footprints, Sparkles, ArrowRight, ShieldCheck, PenLine } from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { auraIcon } from "../lib/markers";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

const BRERA_CENTER = [45.4719, 9.1881];

export default function LandingPage() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const [pois, setPois] = useState([]);
  const isAuthed = !!user && user !== false;
  const isAdmin = isAuthed && user.role === "admin";

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
        <div className="font-serif text-2xl tracking-tight">Aura di Brera</div>
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

      {/* Hero */}
      <section className="px-5 sm:px-10 mt-10 sm:mt-16 max-w-5xl mx-auto">
        <p className="eyebrow">{t(lang, "landing.eyebrow")}</p>
        <h1 className="font-serif text-5xl sm:text-7xl mt-3 leading-[0.95] max-w-3xl">
          {t(lang, "landing.heroPart1")} <em className="text-[var(--terracotta)] not-italic">{t(lang, "landing.heroPart2")}</em>
        </h1>
        <p className="mt-5 text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          {t(lang, "landing.heroIntro")}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
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
        </div>
      </section>

      {/* Map preview */}
      <section className="px-5 sm:px-10 mt-12 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="eyebrow">{t(lang, "landing.shape")}</p>
            <h2 className="font-serif text-3xl mt-1">
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
          <MapContainer
            center={BRERA_CENTER}
            zoom={16}
            scrollWheelZoom={false}
            zoomControl={false}
            className="h-[420px] w-full"
            style={{ height: 420, width: "100%" }}
            data-testid="landing-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {pois.map((p, i) => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={auraIcon(i)}
              />
            ))}
          </MapContainer>
        </div>
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
