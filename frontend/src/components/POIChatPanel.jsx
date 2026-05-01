import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import useLocale from "../hooks/useLocale";

const COPY = {
  it: {
    cta: "Parla con me",
    title: "Dialogo con il luogo",
    poweredHint: "Una conversazione viva, in prima persona, alimentata dai contributi dei curatori.",
    placeholder: "Scrivi qualcosa…",
    send: "Invia",
    typing: "sta sussurrando…",
    close: "chiudi",
    starters: [
      "Raccontami una storia che pochi conoscono.",
      "Chi è passato di qui prima di me?",
      "Cosa dovrei notare se mi siedo un momento?",
    ],
    ctaSubline: "una conversazione, sussurro per sussurro",
  },
  en: {
    cta: "Talk with me",
    title: "A dialogue with this place",
    poweredHint: "A live first-person conversation, fed by curators' contributions.",
    placeholder: "Say something…",
    send: "Send",
    typing: "is whispering…",
    close: "close",
    starters: [
      "Tell me a story few people know.",
      "Who has passed through here before me?",
      "What should I notice if I sit for a moment?",
    ],
    ctaSubline: "a conversation, whisper by whisper",
  },
};

export default function POIChatPanel({ poi, onClose }) {
  const { lang } = useLocale();
  const copy = COPY[lang] || COPY.en;
  const [messages, setMessages] = useState([]);   // {role, content}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scrollerRef = useRef(null);

  // Reset when POI changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
  }, [poi?.id]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, busy]);

  if (!poi) return null;

  const send = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || busy) return;
    setError(null);
    const nextHistory = [...messages, { role: "user", content: trimmed }];
    setMessages(nextHistory);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post(`/pois/${poi.id}/chat`, {
        message: trimmed,
        history: messages,  // history = everything BEFORE this message
        language: lang,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); send(input); };

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border)]" data-testid="poi-chat-panel">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles size={11} className="text-[var(--warm-ochre)]" /> {copy.title}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] italic mt-0.5">
            {copy.poweredHint}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--terracotta)] inline-flex items-center gap-1"
            data-testid="poi-chat-close"
          >
            <X size={12} /> {copy.close}
          </button>
        )}
      </div>

      {/* Conversation transcript */}
      <div
        ref={scrollerRef}
        className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-3"
        data-testid="poi-chat-scroll"
      >
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)] italic">
              {poi.opening_line?.[lang] || poi.opening_line?.it || poi.opening_line?.en || ""}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {copy.starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--terracotta)] hover:text-[var(--terracotta)] transition-colors"
                  data-testid="poi-chat-starter"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[14.5px] leading-relaxed whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-[var(--terracotta)] text-[var(--inverse)] rounded-br-sm"
                    : "bg-[var(--bg)] border border-[var(--border)] font-serif italic text-[var(--text-primary)] rounded-bl-sm"
                }`}
                data-testid={`poi-chat-msg-${m.role}`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <div className="flex justify-start" data-testid="poi-chat-typing">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[var(--bg)] border border-[var(--border)] text-[13px] italic text-[var(--text-tertiary)] inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--terracotta)] animate-pulse" />
              {poi.name} {copy.typing}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-[var(--terracotta)]" data-testid="poi-chat-error">{error}</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={copy.placeholder}
          maxLength={1000}
          disabled={busy}
          className="input-field flex-1 text-sm"
          data-testid="poi-chat-input"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="btn-primary inline-flex items-center justify-center w-11 h-11 p-0"
          aria-label={copy.send}
          data-testid="poi-chat-send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export { COPY as POI_CHAT_COPY };
export function POIChatLauncher({ onOpen }) {
  const { lang } = useLocale();
  const copy = COPY[lang] || COPY.en;
  return (
    <button
      onClick={onOpen}
      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--terracotta)] text-[var(--terracotta)] bg-[var(--terracotta)]/5 hover:bg-[var(--terracotta)] hover:text-[var(--inverse)] transition-colors font-medium"
      data-testid="poi-chat-launcher"
    >
      <MessageCircle size={16} />
      <span>{copy.cta}</span>
      <span className="text-xs opacity-80 italic font-normal hidden sm:inline">— {copy.ctaSubline}</span>
    </button>
  );
}
