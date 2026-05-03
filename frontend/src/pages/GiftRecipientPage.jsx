import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Footprints, Sparkles, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { speak, unlockSpeech } from "../lib/speech";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useArea, pickLocale } from "../lib/area";

const COPY = {
  it: {
    eyebrow: "Un dono da {sender}",
    awaiting: "{area} ti aspettava, {name}.",
    dedicationLabel: "La dedica",
    walkLabel: "La passeggiata che hanno scelto per te",
    walkSize: "{n} luoghi · da percorrere lentamente",
    poiOrdinal: "{i}/{n}",
    cta: "Comincia a camminare",
    ctaHint: "{area} userà la posizione del tuo telefono per riconoscerti quando le passi vicino.",
    welcomeHear: "Ascolta il benvenuto",
    notFoundTitle: "Dono non trovato",
    notFoundText: "Il link che hai aperto non esiste più, o è stato scritto male.",
    backHome: "Torna a {area}",
    sentBy: "Inviato da {sender}",
  },
  en: {
    eyebrow: "A gift from {sender}",
    awaiting: "{area} has been waiting for you, {name}.",
    dedicationLabel: "Their dedication",
    walkLabel: "The walk they chose for you",
    walkSize: "{n} places · to be taken slowly",
    poiOrdinal: "{i}/{n}",
    cta: "Begin walking",
    ctaHint: "{area} will use your phone's location to recognise you as you pass each place.",
    welcomeHear: "Hear the welcome",
    notFoundTitle: "Gift not found",
    notFoundText: "The link you opened no longer exists, or was mistyped.",
    backHome: "Back to {area}",
    sentBy: "Sent by {sender}",
  },
};

function format(s, params) {
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}

const FADE_UP = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function GiftRecipientPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/itineraries/${slug}`)
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [slug]);

  // Render Italian by default unless the gift was made in English.
  const lang = (data && data.language) || "it";
  const area = useArea();
  const areaName = pickLocale(area.area, lang) || "the area";
  const copy = (() => {
    const src = COPY[lang] || COPY.it;
    const out = {};
    for (const [k, v] of Object.entries(src)) {
      out[k] = typeof v === "string" ? v.replace(/\{area\}/g, areaName) : v;
    }
    return out;
  })();

  if (error) {
    return (
      <div className="min-h-screen px-6 pt-24 max-w-md mx-auto text-center" data-testid="gift-not-found">
        <Gift size={28} className="mx-auto text-[var(--text-tertiary)]" />
        <h1 className="font-serif text-3xl mt-4">{copy.notFoundTitle}</h1>
        <p className="mt-3 text-[var(--text-secondary)]">{copy.notFoundText}</p>
        <Link to="/" className="btn-primary inline-block mt-6">{copy.backHome}</Link>
      </div>
    );
  }

  if (!data) {
    return <p className="p-10 text-center text-[var(--text-tertiary)]">…</p>;
  }

  const pois = data.pois || [];

  const speakWelcome = () => {
    unlockSpeech();
    const line = format(copy.awaiting, { name: data.recipient_name });
    speak(line, { lang });
  };

  return (
    <div className="min-h-screen pb-24" data-testid="gift-recipient">
      <div className="absolute top-5 right-5 z-10"><LanguageSwitcher /></div>

      {/* Hero — the dedicated whisper */}
      <section className="relative px-6 pt-20 pb-16 max-w-2xl mx-auto text-center">
        <motion.div {...FADE_UP} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--terracotta)] tracking-[0.18em] uppercase">
            <Gift size={14} /> {format(copy.eyebrow, { sender: data.sender_name })}
          </div>
          <h1
            className="font-serif text-5xl sm:text-6xl leading-[1.05] mt-4"
            data-testid="gift-greeting"
          >
            {format(copy.awaiting, { name: data.recipient_name })}
          </h1>
          <button
            onClick={speakWelcome}
            className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)] hover:text-[var(--terracotta)] transition-colors inline-flex items-center gap-1.5"
            data-testid="gift-hear-welcome"
          >
            <Sparkles size={12} /> {copy.welcomeHear}
          </button>
        </motion.div>
      </section>

      {/* Dedication card */}
      <section className="px-6 max-w-xl mx-auto">
        <motion.div
          {...FADE_UP} transition={{ duration: 0.6, delay: 0.15 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6"
          data-testid="gift-dedication-card"
        >
          <p className="eyebrow mb-3">{copy.dedicationLabel}</p>
          <p className="font-serif text-lg leading-relaxed text-[var(--text-primary)] whitespace-pre-line">
            {data.dedication}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-5 italic text-right">
            — {format(copy.sentBy, { sender: data.sender_name })}
          </p>
        </motion.div>
      </section>

      {/* The walk */}
      <section className="px-6 max-w-2xl mx-auto mt-14">
        <div className="text-center mb-8">
          <p className="eyebrow flex items-center justify-center gap-1.5">
            <Footprints size={11} /> {copy.walkLabel}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {format(copy.walkSize, { n: pois.length })}
          </p>
        </div>
        <div className="space-y-3">
          {pois.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: 0.04 * idx }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex gap-4 items-start"
              data-testid={`gift-poi-card-${p.id}`}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--terracotta)]/8 text-[var(--terracotta)] grid place-items-center font-serif text-lg">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="eyebrow text-[10px]">{p.category}</p>
                <h3 className="font-serif text-xl mt-0.5 leading-tight">{p.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5">{p.short_description}</p>
                {p.address && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1.5">{p.address}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/listen?virtual=1"
            className="btn-primary inline-flex items-center gap-2"
            data-testid="gift-begin-walk"
          >
            {copy.cta} <ArrowRight size={16} />
          </Link>
          <p className="text-xs text-[var(--text-tertiary)] mt-3 max-w-sm mx-auto">{copy.ctaHint}</p>
        </div>
      </section>
    </div>
  );
}
