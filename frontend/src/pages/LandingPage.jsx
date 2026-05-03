import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ear, Footprints, Sparkles, ArrowRight, ShieldCheck, PenLine, Gift } from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LandmarkMap from "../components/LandmarkMap";
import LandmarkThumbs from "../components/LandmarkThumbs";
import LandmarkDetail from "../components/LandmarkDetail";

// Five well-known Brera anchors. NOT in the POI database — these are public
// landmarks meant to orient newcomers before the secret whispers begin.
// Images come from Wikimedia Commons via the wsrv.nl free caching proxy
// (keeps Wikimedia happy about hotlinking + guarantees fast CORS-friendly delivery).
//
// Each landmark also carries a short "voice" (a first-person line spoken by the
// place itself) — used in the inline detail panel to teach new users the core
// idea: places here speak to YOU.
const IMG_PROXY = "https://wsrv.nl/?w=600&h=600&fit=cover&output=jpg&url=";
const LANDMARKS = [
  {
    id: "accademia",
    name: { en: "Accademia di Belle Arti di Brera", it: "Accademia di Belle Arti di Brera" },
    note: { en: "Italy's most storied art school, founded 1776.", it: "La più storica accademia d'arte d'Italia, fondata nel 1776." },
    intro: {
      it: "Sotto i miei portici, generazioni di studenti hanno imparato a guardare. Ogni mattina alle otto, l'odore di trementina si mescola al caffè della latteria di fronte. Cammina lentamente — qui ho imparato a riconoscere i passi degli innamorati.",
      en: "Generations of students have learned to see beneath my arcades. Every morning at eight, the scent of turpentine blends with coffee from the dairy across the way. Walk slowly — I've learned to recognise the footsteps of lovers here.",
    },
    voice: {
      it: "Cammina sotto i miei portici. Ti dirò chi è passato di qui.",
      en: "Walk beneath my arcades. I'll tell you who has passed through.",
    },
    latitude: 45.4720, longitude: 9.1879,
    image: IMG_PROXY + "upload.wikimedia.org/wikipedia/commons/thumb/d/db/Milano_brera_cortile.jpg/600px-Milano_brera_cortile.jpg",
  },
  {
    id: "pinacoteca",
    name: { en: "Pinacoteca di Brera", it: "Pinacoteca di Brera" },
    note: { en: "Raphael, Mantegna and Caravaggio under one ceiling.", it: "Raffaello, Mantegna e Caravaggio sotto lo stesso soffitto." },
    intro: {
      it: "Custodisco lo Sposalizio della Vergine di Raffaello, il Cristo morto di Mantegna, la Cena in Emmaus di Caravaggio. Ma il vero spettacolo è il cortile: in primavera la magnolia di Napoleone fiorisce sopra le tue spalle.",
      en: "I keep Raphael's Marriage of the Virgin, Mantegna's Dead Christ, Caravaggio's Supper at Emmaus. But the real show is the courtyard: in spring, Napoleon's magnolia blooms above your shoulders.",
    },
    voice: {
      it: "Ho conservato i loro silenzi. Vieni a sentirli.",
      en: "I have kept their silences. Come and feel them.",
    },
    latitude: 45.4720, longitude: 9.1881,
    image: IMG_PROXY + "upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Milan_-_Pinacoth%C3%A8que_de_Brera_-_Cour_int%C3%A9rieure.jpg/600px-Milan_-_Pinacoth%C3%A8que_de_Brera_-_Cour_int%C3%A9rieure.jpg",
  },
  {
    id: "cusani",
    name: { en: "Palazzo Cusani", it: "Palazzo Cusani" },
    note: { en: "Two facades, two architects, one quiet quarrel.", it: "Due facciate, due architetti, un litigio in pietra." },
    intro: {
      it: "Guardami da via Brera, poi gira l'angolo. Sembro un altro edificio, vero? È perché due architetti — Ruggeri nel '700, Piermarini un secolo dopo — non si sono mai messi d'accordo. Sono sede del Comando Militare dal 1860, ma ricordo ancora la festa per Maria Teresa d'Austria.",
      en: "Look at me from Via Brera, then turn the corner. I look like a different building, don't I? Two architects — Ruggeri in the 1700s, Piermarini a century later — never agreed. I've housed the Military Command since 1860, but I still remember the ball for Maria Theresa of Austria.",
    },
    voice: {
      it: "Ho due volti. Vieni a scoprire perché.",
      en: "I wear two faces. Come and find out why.",
    },
    latitude: 45.4729, longitude: 9.1888,
    image: IMG_PROXY + "upload.wikimedia.org/wikipedia/commons/thumb/1/11/Palazzo_Cusani_Milan_2.jpg/600px-Palazzo_Cusani_Milan_2.jpg",
  },
  {
    id: "orsini",
    name: { en: "Palazzo Orsini", it: "Palazzo Orsini" },
    note: { en: "Versace's HQ since 1980 — frescoed ceilings still intact.", it: "Sede Versace dal 1980 — soffitti affrescati ancora intatti." },
    intro: {
      it: "Da quasi cinquant'anni la maison Versace cuce i suoi sogni dietro i miei portoni. Sopra le sale dove Donatella sceglie i tessuti, i miei soffitti del Settecento mostrano ancora le loro divinità affrescate. Pochi sanno che dietro le persiane chiuse, una volta, abitava un'astronoma.",
      en: "For nearly fifty years the Versace maison has stitched its dreams behind my doors. Above the rooms where Donatella picks fabrics, my eighteenth-century ceilings still show their frescoed gods. Few know that behind these closed shutters once lived a woman astronomer.",
    },
    voice: {
      it: "Sotto le mode di oggi, conservo storie più antiche.",
      en: "Beneath today's fashions, I keep older stories.",
    },
    latitude: 45.4719, longitude: 9.1909,
    image: IMG_PROXY + "upload.wikimedia.org/wikipedia/commons/thumb/3/31/Palazzo_Orsini_MI.jpg/600px-Palazzo_Orsini_MI.jpg",
  },
  {
    id: "scala",
    name: { en: "Teatro alla Scala", it: "Teatro alla Scala" },
    note: { en: "The opera house that crowns the southern edge of Brera.", it: "Il teatro d'opera che corona il bordo sud di Brera." },
    intro: {
      it: "Il 7 dicembre, Milano si veste per me. Sotto il mio palco hanno cantato Maria Callas e Luciano Pavarotti, e prima di loro Maria Malibran morta a 28 anni. Ma se passi alle sei del mattino, sentirai le donne delle pulizie cantare la loro versione della Traviata.",
      en: "On 7 December, Milan dresses up for me. Beneath my stage Maria Callas and Luciano Pavarotti have sung — and before them Maria Malibran, who died at 28. But pass by at six in the morning and you'll hear the cleaning women sing their own version of La Traviata.",
    },
    voice: {
      it: "Le mie note iniziano molto prima del sipario.",
      en: "My notes begin long before the curtain.",
    },
    latitude: 45.4671, longitude: 9.1894,
    image: IMG_PROXY + "upload.wikimedia.org/wikipedia/commons/thumb/0/04/Milano_-_Teatro_alla_Scala_3924.jpg/600px-Milano_-_Teatro_alla_Scala_3924.jpg",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const [pois, setPois] = useState([]);
  const [activeLandmark, setActiveLandmark] = useState(null);
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
          <LandmarkMap
            pois={pois}
            landmarks={LANDMARKS}
            activeLandmarkId={activeLandmark}
            onSelectLandmark={setActiveLandmark}
            height={560}
          />
        </div>

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
          landmarks={LANDMARKS}
          activeId={activeLandmark}
          onSelect={(id) => setActiveLandmark((curr) => (curr === id ? null : id))}
          lang={lang}
        />

        <LandmarkDetail
          landmark={LANDMARKS.find((l) => l.id === activeLandmark)}
          lang={lang}
          onClose={() => setActiveLandmark(null)}
        />

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
