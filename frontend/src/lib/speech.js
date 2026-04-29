import { devWarn } from "./log";

// Wrapper around the Web Speech API SpeechSynthesis. No-ops gracefully when the
// browser doesn't support speech (Firefox iOS, etc.).
export function isSpeechSupported() {
  return typeof window !== "undefined"
    && typeof window.speechSynthesis !== "undefined"
    && typeof window.SpeechSynthesisUtterance !== "undefined";
}

export function getVoicesForLang(lang) {
  if (!isSpeechSupported()) return [];
  const all = window.speechSynthesis.getVoices() || [];
  if (!lang) return all;
  return all.filter((v) => (v.lang || "").toLowerCase().startsWith(lang.toLowerCase()));
}

export function speak(text, { lang = "en", rate = 0.95, volume = 0.85 } = {}) {
  if (!isSpeechSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.volume = volume;
    const matching = getVoicesForLang(lang);
    if (matching.length > 0) u.voice = matching[0];
    window.speechSynthesis.speak(u);
  } catch (err) {
    devWarn("speak() failed:", err);
  }
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch (err) { devWarn("stopSpeaking() failed:", err); }
}
