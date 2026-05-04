import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Volume2, Pause, ArrowRight, Sparkles, Gift } from "lucide-react";

import { useArea, pickLocale } from "../lib/area";
import useLocale from "../hooks/useLocale";
import { speak, stopSpeaking, isSpeechSupported, unlockSpeech } from "../lib/speech";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Image proxy — consistent with LandingPage.
const IMG_PROXY = "https://wsrv.nl/?w=900&h=1200&fit=cover&output=jpg&url=";

// Vico-authentic hero intro (replaces Brera's ginkgo/latteria/Napoleon motifs).
const HERO_INTRO = {
  it: "Una chiesa a picco sul mare dal 1320. Un castello abitato dalla stessa famiglia da diciannove generazioni. La pizza a metro inventata nel 1960 perché un pullman di pellegrini aveva fame. Le terme dove Caruso cantava sottovoce prima dei concerti. Non li devi cercare — saranno loro a sfiorarti il polso quando ci passerai vicino.",
  en: "A church clinging to the cliff since 1320. A castle lived in by the same family for nineteen generations. Pizza-by-the-metre invented in 1960 because a busload of pilgrims was hungry. Thermal baths where Caruso hummed before his summer concerts. You don't search for them — they will quietly reach for your wrist when you pass close enough.",
};

export default function VicoPreviewPage() {
  const { lang } = useLocale();
  const area = useArea();
  const [speaking, setSpeaking] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);

  const brand = pickLocale(area?.brand, lang) || "Aura di Vico Equense";
  const areaLabel = pickLocale(area?.area, lang) || "Vico Equense";
  const cityLabel = pickLocale(area?.city, lang) || "Penisola Sorrentina";
  const tagline = pickLocale(area?.tagline, lang) || "la città a picco sul mare";
  const intro = pickLocale(area?.narrator?.intro || {}, lang);
  const ttsLang = lang === "it" ? "it-IT" : "en-US";

  // First two paragraphs of the monologue for the hero card.
  const monologueTeaser = useMemo(() => {
    const paras = (intro || "").split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    return paras.slice(0, 2).join("\n\n");
  }, [intro]);

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

  useEffect(() => () => stopSpeaking(), []);

  const landmarks = (area.landmarks || []).map((lm) => ({
    id: lm.id,
    name: pickLocale(lm.name, lang) || lm.id,
    note: pickLocale(lm.note, lang) || "",
    voice: pickLocale(lm.voice, lang) || "",
    image: lm.image_wikimedia ? `${IMG_PROXY}${lm.image_wikimedia}` : (lm.image_url || ""),
  }));

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text-primary)" }}
      data-testid="vico-preview-page"
    >
      {/* Grain overlay for depth */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 pt-6">
        <div className="font-serif text-xl tracking-tight" data-testid="vico-preview-brand">
          {brand}
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          <Link
            to="/"
            className="text-[var(--text-secondary)] hover:text-[var(--terracotta)] transition-colors text-xs uppercase tracking-[0.14em]"
            data-testid="vico-preview-back-link"
          >
            ← {lang === "it" ? "Versione classica" : "Classic version"}
          </Link>
        </nav>
      </header>

      {/* HERO — cinematic, asymmetric, no map */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 px-6 sm:px-12 pt-16 sm:pt-24 pb-24 max-w-6xl mx-auto"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xs uppercase tracking-[0.24em]"
          style={{ color: "var(--terracotta)" }}
          data-testid="vico-preview-eyebrow"
        >
          {cityLabel.toUpperCase()} · {tagline.toUpperCase()}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.35 }}
          className="font-serif mt-4 leading-[0.95]"
          style={{ fontSize: "clamp(3rem, 8vw, 7rem)", fontWeight: 400 }}
          data-testid="vico-preview-title"
        >
          {areaLabel}
          <br />
          <em
            className="not-italic"
            style={{ color: "var(--terracotta)", fontStyle: "italic", fontWeight: 400 }}
          >
            {lang === "it" ? "ti sussurra." : "whispers to you."}
          </em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="mt-8 max-w-2xl text-lg sm:text-xl leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
          data-testid="vico-preview-heroIntro"
        >
          {HERO_INTRO[lang] || HERO_INTRO.en}
        </motion.p>

        {/* Monologue teaser card */}
        {monologueTeaser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.95 }}
            className="relative mt-14 max-w-3xl"
            data-testid="vico-preview-monologue-card"
          >
            <div
              aria-hidden
              className="absolute -left-4 top-0 h-full w-1"
              style={{ background: "var(--terracotta)" }}
            />
            <p
              className="pl-8 font-serif italic leading-relaxed"
              style={{
                fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
                color: "var(--text-primary)",
              }}
            >
              “{monologueTeaser.split("\n\n")[0]}”
            </p>
            <p
              className="pl-8 mt-5 font-serif italic leading-relaxed"
              style={{
                fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
                color: "var(--text-secondary)",
              }}
            >
              {monologueTeaser.split("\n\n")[1] || ""}
            </p>

            <div className="pl-8 mt-8 flex flex-wrap items-center gap-3">
              {isSpeechSupported() && intro && (
                <button
                  type="button"
                  onClick={handleHear}
                  data-testid="vico-preview-hear-btn"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full transition-all hover:scale-[1.02]"
                  style={{
                    background: speaking ? "var(--deep-green)" : "var(--terracotta)",
                    color: "#fff",
                    fontSize: 14,
                    letterSpacing: "0.06em",
                    boxShadow: "0 8px 24px rgba(208, 108, 59, 0.3)",
                  }}
                >
                  {speaking ? <Pause size={16} /> : <Volume2 size={16} />}
                  {speaking
                    ? (lang === "it" ? "Ferma l'ascolto" : "Stop listening")
                    : (lang === "it" ? "Ascolta la sua voce" : "Hear her speak")}
                </button>
              )}
              <span
                className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {lang === "it" ? "≈ 2 minuti" : "≈ 2 minutes"}
              </span>
            </div>
          </motion.div>
        )}
      </motion.section>

      {/* Deep-green "whispered places" band */}
      <section
        className="relative z-10 py-24 sm:py-32 px-6 sm:px-12"
        style={{ background: "var(--deep-green)", color: "var(--inverse)" }}
        data-testid="vico-preview-landmarks-band"
      >
        <div className="max-w-6xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.24em] mb-4"
            style={{ color: "var(--warm-ochre)" }}
          >
            {lang === "it" ? "Cinque voci per cominciare" : "Five voices to begin with"}
          </p>
          <h2
            className="font-serif mb-10 leading-[1.0]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400 }}
          >
            {lang === "it"
              ? "I luoghi che non smettono di parlare."
              : "The places that never stop speaking."}
          </h2>

          <div
            className="grid gap-6 sm:gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {landmarks.map((lm, i) => (
              <motion.article
                key={lm.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="relative overflow-hidden rounded-lg"
                data-testid={`vico-preview-landmark-${lm.id}`}
                style={{ aspectRatio: "3 / 4" }}
              >
                {lm.image && (
                  <img
                    src={lm.image}
                    alt={lm.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(31, 79, 92, 0.95) 0%, rgba(31, 79, 92, 0.4) 50%, rgba(31, 79, 92, 0) 100%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3
                    className="font-serif text-xl leading-tight mb-2"
                    style={{ color: "#fff", fontWeight: 400 }}
                  >
                    {lm.name}
                  </h3>
                  {lm.voice && (
                    <p
                      className="font-serif italic text-sm leading-snug"
                      style={{ color: "rgba(245, 239, 226, 0.88)" }}
                    >
                      “{lm.voice}”
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="relative z-10 py-28 px-6 sm:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <Sparkles
            size={32}
            className="mx-auto mb-6"
            style={{ color: "var(--terracotta)" }}
          />
          <h2
            className="font-serif leading-[1.0]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400 }}
            data-testid="vico-preview-cta-title"
          >
            {lang === "it"
              ? "Cammina. Lei farà il resto."
              : "Walk. She'll do the rest."}
          </h2>
          <p
            className="mt-6 text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            {lang === "it"
              ? "Diciotto luoghi sussurrati ti aspettano tra le scogliere e le stradine. Cammina lentamente, e lasciati sfiorare il polso."
              : "Eighteen whispered places wait for you between cliffs and alleys. Walk slowly, and let her reach for your wrist."}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/listen?virtual=1"
              data-testid="vico-preview-begin-btn"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full transition-all hover:scale-[1.02]"
              style={{
                background: "var(--terracotta)",
                color: "#fff",
                fontSize: 15,
                letterSpacing: "0.04em",
                boxShadow: "0 10px 30px rgba(208, 108, 59, 0.35)",
              }}
            >
              {lang === "it" ? "Inizia a camminare" : "Begin walking"}
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/gift/new"
              data-testid="vico-preview-gift-btn"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full transition-all hover:scale-[1.02]"
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontSize: 15,
                letterSpacing: "0.04em",
              }}
            >
              <Gift size={16} />
              {lang === "it" ? "Mandala in dono" : "Send as a gift"}
            </Link>
          </div>
        </motion.div>
      </section>

      <footer
        className="relative z-10 py-10 text-center text-xs uppercase tracking-[0.2em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {brand} · {lang === "it" ? "anteprima" : "preview"}
      </footer>
    </div>
  );
}
