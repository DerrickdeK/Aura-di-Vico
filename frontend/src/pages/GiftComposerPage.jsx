import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Copy, Check, ChevronRight, ArrowLeft } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import useLocale from "../hooks/useLocale";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Local copy — small, page-specific, kept here rather than i18n.js because
// the gift flow is a contained sub-experience.
const COPY = {
  it: {
    eyebrow: "Un dono",
    title: "Regala una passeggiata a Brera",
    lead: "Scegli da 3 a 8 luoghi, scrivi una dedica, e Brera li sussurrerà a chi ami quando aprirà il link.",
    sectionRecipient: "A chi è destinato",
    senderName: "Il tuo nome",
    senderNamePh: "Marco",
    recipientName: "Nome di chi riceve",
    recipientNamePh: "Anna",
    sectionDedication: "La tua dedica",
    dedicationPh: "Cara Anna, Brera ti aspettava. Fai il giro che ti suggerisco — è la mia mappa segreta del quartiere…",
    sectionPois: "Scegli i luoghi",
    poisHint: "Tocca i luoghi per aggiungerli al dono. Da 3 a 8.",
    selected: "{n} selezionati",
    selectedPlural: "{n} selezionati",
    submit: "Crea il dono",
    submitting: "Sto preparando il dono…",
    successTitle: "Il dono è pronto",
    successHint: "Condividi questo link con {name}. Lo apriranno e Brera comincerà a sussurrare per loro.",
    copyLink: "Copia link",
    linkCopied: "Link copiato",
    openAsRecipient: "Vedi come lo riceverà {name} →",
    makeAnother: "Crea un altro dono",
    needMore: "Aggiungi almeno {n} luoghi.",
    tooMany: "Massimo {n} luoghi per dono.",
    backHome: "← Torna a Brera",
    notLoggedTitle: "Accedi per creare un dono",
    notLoggedText: "I doni sono firmati con il tuo nome — devi essere registrato.",
    signIn: "Accedi",
  },
  en: {
    eyebrow: "A gift",
    title: "Send someone a walk through Brera",
    lead: "Pick 3 to 8 places, write a dedication, and Brera will whisper them to your loved one when they open the link.",
    sectionRecipient: "Who it's for",
    senderName: "Your name",
    senderNamePh: "Marco",
    recipientName: "Recipient's name",
    recipientNamePh: "Anna",
    sectionDedication: "Your dedication",
    dedicationPh: "Dear Anna, Brera has been waiting for you. Take this loop — it's my secret map of the quarter…",
    sectionPois: "Pick the places",
    poisHint: "Tap places to add them to the gift. Between 3 and 8.",
    selected: "{n} selected",
    selectedPlural: "{n} selected",
    submit: "Create the gift",
    submitting: "Preparing the gift…",
    successTitle: "Your gift is ready",
    successHint: "Share this link with {name}. When they open it, Brera will start whispering for them.",
    copyLink: "Copy link",
    linkCopied: "Link copied",
    openAsRecipient: "Preview how {name} will receive it →",
    makeAnother: "Create another gift",
    needMore: "Pick at least {n} places.",
    tooMany: "Up to {n} places per gift.",
    backHome: "← Back to Brera",
    notLoggedTitle: "Sign in to create a gift",
    notLoggedText: "Gifts carry your name — you'll need an account.",
    signIn: "Sign in",
  },
};

const MIN_POIS = 3;
const MAX_POIS = 8;

function format(s, params) {
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}

function PoiPicker({ pois, selected, onToggle, fullText }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {pois.map((p) => {
        const idx = selected.indexOf(p.id);
        const active = idx !== -1;
        const disabled = !active && selected.length >= MAX_POIS;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            disabled={disabled}
            className={`text-left p-3 rounded-2xl border transition-all relative ${
              active
                ? "border-[var(--terracotta)] bg-[var(--terracotta)]/8"
                : disabled
                ? "border-[var(--border)] opacity-40 cursor-not-allowed"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--terracotta)]/60"
            }`}
            data-testid={`gift-poi-${p.id}`}
          >
            {active && (
              <span
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--terracotta)] text-[var(--inverse)] grid place-items-center text-xs font-medium"
                data-testid={`gift-poi-order-${p.id}`}
              >
                {idx + 1}
              </span>
            )}
            <p className="eyebrow text-[10px]">{p.category}</p>
            <p className="font-serif text-base mt-0.5 leading-tight pr-7">{p.name}</p>
            {fullText && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-2">{p.short_description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function GiftComposerPage() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const navigate = useNavigate();
  const copy = COPY[lang] || COPY.en;

  const [pois, setPois] = useState([]);
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [dedication, setDedication] = useState("");
  const [picked, setPicked] = useState([]);  // ordered list of poi ids
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);   // { slug, recipient_name }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/pois").then(({ data }) => setPois(data)).catch(() => setPois([]));
  }, []);

  // Pre-fill sender name from the authed user once available.
  useEffect(() => {
    if (user && typeof user === "object" && user.name) {
      setSenderName((prev) => prev || user.name);
    }
  }, [user]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) {
    return (
      <div className="min-h-screen px-6 pt-20 max-w-md mx-auto text-center" data-testid="gift-not-authed">
        <Gift size={32} className="mx-auto text-[var(--terracotta)]" />
        <h1 className="font-serif text-3xl mt-4">{copy.notLoggedTitle}</h1>
        <p className="mt-3 text-[var(--text-secondary)]">{copy.notLoggedText}</p>
        <Link to="/login?next=/gift/new" className="btn-primary inline-block mt-6">{copy.signIn}</Link>
      </div>
    );
  }

  const togglePoi = (id) => {
    setPicked((cur) => {
      const idx = cur.indexOf(id);
      if (idx !== -1) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_POIS) return cur;
      return [...cur, id];
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (picked.length < MIN_POIS) {
      setError(format(copy.needMore, { n: MIN_POIS }));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data } = await api.post("/itineraries", {
        sender_name: senderName.trim(),
        recipient_name: recipientName.trim(),
        dedication: dedication.trim(),
        poi_ids: picked,
        language: lang,
      });
      setCreated(data);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    const backend = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const url = `${backend}/api/share/${created.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback: select-and-prompt; very rare on https://
      window.prompt("Copy:", url);
    }
  };

  const reset = () => {
    setCreated(null);
    setRecipientName("");
    setDedication("");
    setPicked([]);
    setCopied(false);
  };

  if (created) {
    // The shared URL is the backend /api/share/<slug> endpoint: it serves
    // OG-tagged HTML so that pasting the link into WhatsApp / iMessage /
    // Slack / email yields a personalised preview card. Real browsers
    // are redirected to /gift/<slug> instantly via meta-refresh.
    const backend = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const url = `${backend}/api/share/${created.slug}`;
    return (
      <div className="min-h-screen px-6 pt-12 pb-32 max-w-xl mx-auto" data-testid="gift-created">
        <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] mb-6">
          <ArrowLeft size={14} /> {copy.backHome}
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--terracotta)]/12 text-[var(--terracotta)]">
            <Gift size={26} />
          </div>
          <p className="eyebrow mt-4">{copy.eyebrow}</p>
          <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-none">{copy.successTitle}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">{format(copy.successHint, { name: created.recipient_name })}</p>
        </motion.div>

        <div className="mt-8 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="eyebrow mb-2">URL</p>
          <p className="font-mono text-sm break-all text-[var(--text-primary)]" data-testid="gift-link">{url}</p>
          <button
            onClick={copyLink}
            className="btn-primary w-full mt-4 inline-flex items-center justify-center gap-2"
            data-testid="gift-copy-link"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? copy.linkCopied : copy.copyLink}
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => navigate(`/gift/${created.slug}`)}
            className="btn-ghost flex-1 inline-flex items-center justify-center gap-1.5"
            data-testid="gift-preview"
          >
            {format(copy.openAsRecipient, { name: created.recipient_name })}
          </button>
          <button onClick={reset} className="btn-ghost flex-1" data-testid="gift-make-another">
            {copy.makeAnother}
          </button>
        </div>
      </div>
    );
  }

  const selectedLabel = format(picked.length === 1 ? copy.selected : copy.selectedPlural, { n: picked.length });

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto" data-testid="gift-composer">
      <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] mb-6">
        <ArrowLeft size={14} /> {copy.backHome}
      </Link>

      <header className="text-center mb-8">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-none">{copy.title}</h1>
        <p className="mt-3 text-[var(--text-secondary)] max-w-md mx-auto">{copy.lead}</p>
      </header>

      <form onSubmit={submit} className="space-y-7">
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <p className="eyebrow mb-3">{copy.sectionRecipient}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">{copy.senderName}</label>
              <input className="input-field" required maxLength={80}
                value={senderName} onChange={(e) => setSenderName(e.target.value)}
                placeholder={copy.senderNamePh} data-testid="gift-sender" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] block mb-1">{copy.recipientName}</label>
              <input className="input-field" required maxLength={80}
                value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                placeholder={copy.recipientNamePh} data-testid="gift-recipient" />
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <p className="eyebrow mb-3">{copy.sectionDedication}</p>
          <textarea
            className="input-field"
            rows={5}
            required
            maxLength={1200}
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            placeholder={copy.dedicationPh}
            data-testid="gift-dedication"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">{dedication.length}/1200</p>
        </section>

        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="eyebrow">{copy.sectionPois}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{copy.poisHint}</p>
            </div>
            <p className="text-sm text-[var(--terracotta)] font-medium" data-testid="gift-selected-count">
              {selectedLabel}
            </p>
          </div>
          <PoiPicker pois={pois} selected={picked} onToggle={togglePoi} fullText />
        </section>

        {error && <p className="text-sm text-[var(--terracotta)]" data-testid="gift-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full inline-flex items-center justify-center gap-2"
          disabled={busy || picked.length < MIN_POIS}
          data-testid="gift-submit"
        >
          {busy ? copy.submitting : copy.submit}
          {!busy && <ChevronRight size={16} />}
        </button>
      </form>
    </div>
  );
}
