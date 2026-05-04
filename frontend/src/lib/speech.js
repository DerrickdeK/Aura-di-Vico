import { devWarn } from "./log";

// Wrapper around the Web Speech API SpeechSynthesis with quality-aware voice
// selection. Native browser TTS varies wildly by OS:
//   • macOS / iOS  → ships premium "Samantha", "Alex", "Alice" voices.
//   • Windows      → Microsoft Aria/Guy/Elsa "Online (Natural)" voices.
//   • Android      → Google "en-us-x-tpd-network" / Google "it-it-x-itc"
//                    network voices (high quality) and local fallback voices.
//   • Linux/Chrome → only espeak/festival, which is the *garbled* voice the
//                    user complained about. We refuse to use those and fall
//                    back to the default voice + slower rate so it's at least
//                    intelligible.
//
// No-ops gracefully when the browser doesn't support speech (Firefox iOS).

// Substrings (lower-cased) that mark a voice as low quality. We avoid them
// even when nothing else matches in the requested language.
const BAD_VOICE_HINTS = [
  "espeak", "e-speak",
  "festival",
  "pico",                 // Android low-quality fallback
  "compact", "eloquence",
];

// Substrings (lower-cased) that mark a voice as premium. Order matters: the
// first hint to match wins, so put the very best engines on top.
const PREMIUM_VOICE_HINTS = [
  "natural", "neural",            // Microsoft / Edge online voices
  "online",                       // Microsoft online suffix
  "premium", "enhanced",          // Apple "Enhanced/Premium" voices
  "google",                       // Android / Chrome OS Google voices
  "siri", "samantha", "alex", "alice", "karen", "daniel", "moira",
  "luca", "federica", "alice (italiano)",
  "microsoft",                    // generic Microsoft fallback
];

let _voiceCache = null;

function _allVoices() {
  if (!isSpeechSupported()) return [];
  if (_voiceCache && _voiceCache.length) return _voiceCache;
  const v = window.speechSynthesis.getVoices() || [];
  if (v.length) _voiceCache = v;
  return v;
}

// The voice list is populated asynchronously on Chrome. Listen once and cache.
if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      _voiceCache = window.speechSynthesis.getVoices() || [];
    };
  } catch (err) { /* older Safari throws on assignment */ }
}

export function isSpeechSupported() {
  return typeof window !== "undefined"
    && typeof window.speechSynthesis !== "undefined"
    && typeof window.SpeechSynthesisUtterance !== "undefined";
}

export function getVoicesForLang(lang) {
  if (!isSpeechSupported()) return [];
  const all = _allVoices();
  if (!lang) return all;
  const target = lang.toLowerCase();
  const base = target.split("-")[0];
  return all.filter((v) => {
    const vl = (v.lang || "").toLowerCase();
    return vl.startsWith(target) || vl.startsWith(base);
  });
}

function _scoreVoice(v) {
  const name = (v.name || "").toLowerCase();
  // Reject espeak/festival outright.
  for (const bad of BAD_VOICE_HINTS) {
    if (name.includes(bad)) return -100;
  }
  // Premium hints earn high scores. Earlier hints score higher.
  for (let i = 0; i < PREMIUM_VOICE_HINTS.length; i++) {
    if (name.includes(PREMIUM_VOICE_HINTS[i])) return 100 - i;
  }
  // localService=true on macOS/iOS usually means premium baked-in voice.
  // On Linux/Chrome localService=true is espeak (already filtered above).
  if (v.localService) return 30;
  // Network/cloud voices on Android & Edge are usually quite good.
  return 10;
}

function pickBestVoice(lang) {
  const candidates = getVoicesForLang(lang);
  if (candidates.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const v of candidates) {
    const s = _scoreVoice(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  // If everything we found is junk (espeak only) return null — speaking with
  // the system default and a slower rate is less awful than locking to espeak.
  if (bestScore < 0) return null;
  return best;
}

let _unlocked = false;

// iOS / Safari refuse to speak until a SpeechSynthesisUtterance is created
// inside a user gesture. Call this from a click/tap handler once.
export function unlockSpeech() {
  if (_unlocked || !isSpeechSupported()) return;
  try {
    const u = new window.SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    _unlocked = true;
  } catch (err) {
    devWarn("unlockSpeech() failed:", err);
  }
}

// TTS engines stumble on smart quotes, em-dashes, ellipses and dense numerals.
// Normalise the input string to plain ASCII punctuation + spelled-out numerals
// for the most common cases, so even fallback voices don't lose their footing.
function normalizeForTTS(text, langTag) {
  if (!text) return "";
  let out = String(text);
  // Smart quotes / dashes / ellipses
  out = out
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, ", ")          // –, —, ― → comma+space (natural pause)
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");                          // non-breaking → regular space
  // Collapse multiple punctuation marks
  out = out.replace(/\s*,\s*,\s*/g, ", ");
  // Strip stray asterisks / underscores that sometimes leak from markdown
  out = out.replace(/[*_`]+/g, "");
  // Spelled-out years for Italian — engines often stumble on 1320 / 1732 / 1875.
  if (langTag.toLowerCase().startsWith("it")) {
    out = out.replace(/\b1\s?(\d{3})\b/g, (m, p1) => {
      const n = parseInt("1" + p1, 10);
      // Cheap heuristic: only spell out 4-digit years between 1000 and 2099.
      if (n >= 1000 && n <= 2099) return spellYearIT(n);
      return m;
    });
  }
  // Collapse runs of whitespace.
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function spellYearIT(n) {
  // Spelt-out Italian for years 1000..2099 (plenty for our content).
  const ones = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove",
                "dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici",
                "diciassette", "diciotto", "diciannove"];
  const tens = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];
  function below100(x) {
    if (x < 20) return ones[x];
    const t = Math.floor(x/10), o = x % 10;
    let s = tens[t];
    if (o === 1 || o === 8) s = s.slice(0, -1);
    return s + ones[o];
  }
  function below1000(x) {
    if (x < 100) return below100(x);
    const h = Math.floor(x/100), r = x % 100;
    const hpart = h === 1 ? "cento" : ones[h] + "cento";
    return r ? hpart + below100(r) : hpart;
  }
  const thousands = Math.floor(n/1000), rest = n % 1000;
  const tpart = thousands === 1 ? "mille" : ones[thousands] + "mila";
  return rest ? tpart + below1000(rest) : tpart;
}

export function speak(text, { lang = "en", rate, volume = 0.9, pitch = 1, onEnd, onError } = {}) {
  if (!isSpeechSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    // Use BCP-47 forms so engines pick the right phoneme set.
    const langTag = lang.toLowerCase().startsWith("it")
      ? "it-IT"
      : lang.toLowerCase().startsWith("en") ? "en-US" : lang;
    const cleaned = normalizeForTTS(text, langTag);
    const u = new window.SpeechSynthesisUtterance(cleaned);
    u.lang = langTag;
    const best = pickBestVoice(langTag);
    if (best) {
      u.voice = best;
      u.lang = best.lang || langTag;
    }
    // Italian fallback voices struggle more than English ones — slow them down
    // a touch further so the listener can keep up.
    const isIT = langTag.startsWith("it");
    const defaultRate = best
      ? (isIT ? 0.88 : 0.92)
      : (isIT ? 0.78 : 0.85);
    u.rate = typeof rate === "number" ? rate : defaultRate;
    u.volume = volume;
    u.pitch = pitch;
    if (typeof onEnd === "function") u.onend = onEnd;
    if (typeof onError === "function") u.onerror = onError;
    window.speechSynthesis.speak(u);
  } catch (err) {
    devWarn("speak() failed:", err);
  }
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch (err) { devWarn("stopSpeaking() failed:", err); }
}
