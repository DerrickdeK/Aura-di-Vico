// Minimal i18n strings used by the "city talks" experience. One JS map keeps
// the bundle tiny — we don't need a full i18n library for the small set of
// labels the listening UX uses.
const STRINGS = {
  en: {
    languageName: "English",
    listeningTitle: "Brera is listening for you…",
    listeningSubtitle: "Walk. Wait. The city will whisper when something wants to find you.",
    sensedTease: "Something is watching you, {distance} m {bearing}.",
    youreHere: "You're here.",
    tapToReadStory: "Tap to read its story",
    discoveriesTitle: "Whispers collected",
    discoveriesEmpty: "Nothing has called you yet. Step outside and listen.",
    silenceCity: "The city is quiet. Keep walking.",
    silenceFix: "Listening for a fix on you…",
    silenceGeoOff: "Location is off — try the ghost walk to feel how it works.",
    onboarding: {
      welcome: "Welcome to Brera",
      step1: "Choose your language",
      step2: "What should the city whisper to you about?",
      step3: "May the city call you when your phone is locked?",
      pick3to5: "Pick 3 to 5 themes.",
      enable: "Enable background calls",
      skip: "Maybe later",
      finish: "Begin listening",
      next: "Next",
      back: "Back",
    },
    interests: {
      hidden_gardens: "Hidden Gardens",
      historic_cafes: "Historic Cafés & Trattorie",
      hidden_courtyards: "Hidden Courtyards & Palaces",
      renaissance_traces: "Renaissance & Historic Traces",
      artisan_workshops: "Artisan Workshops & Shops",
    },
    profile: {
      title: "Your profile",
      language: "Language",
      interests: "Interests",
      notifications: "Background calls",
      notificationsHint: "Allow the city to whisper even when the app is closed.",
      logout: "Sign out",
      save: "Save",
      saved: "Saved",
    },
    bearings: {
      N: "north", NE: "north-east", E: "east", SE: "south-east",
      S: "south", SW: "south-west", W: "west", NW: "north-west",
    },
    zones: { sensed: "Sensed", called: "Called", found: "Found" },
  },
  it: {
    languageName: "Italiano",
    listeningTitle: "Brera ti sta ascoltando…",
    listeningSubtitle: "Cammina. Aspetta. La città sussurrerà quando qualcosa vorrà trovarti.",
    sensedTease: "Qualcosa ti sta osservando, a {distance} m verso {bearing}.",
    youreHere: "Sei qui.",
    tapToReadStory: "Tocca per leggere la sua storia",
    discoveriesTitle: "Sussurri raccolti",
    discoveriesEmpty: "Nessuno ti ha ancora chiamato. Esci e ascolta.",
    silenceCity: "La città è silenziosa. Continua a camminare.",
    silenceFix: "In attesa di localizzarti…",
    silenceGeoOff: "Posizione disattivata — prova la passeggiata fantasma per scoprire come funziona.",
    onboarding: {
      welcome: "Benvenuto a Brera",
      step1: "Scegli la lingua",
      step2: "Di cosa dovrebbe sussurrarti la città?",
      step3: "Può la città chiamarti anche quando il telefono è bloccato?",
      pick3to5: "Scegli da 3 a 5 temi.",
      enable: "Attiva le chiamate in background",
      skip: "Forse più tardi",
      finish: "Inizia ad ascoltare",
      next: "Avanti",
      back: "Indietro",
    },
    interests: {
      hidden_gardens: "Giardini segreti",
      historic_cafes: "Caffè e trattorie storiche",
      hidden_courtyards: "Cortili e palazzi nascosti",
      renaissance_traces: "Tracce rinascimentali e storiche",
      artisan_workshops: "Botteghe artigiane",
    },
    profile: {
      title: "Il tuo profilo",
      language: "Lingua",
      interests: "Interessi",
      notifications: "Chiamate in background",
      notificationsHint: "Permetti alla città di sussurrare anche con l'app chiusa.",
      logout: "Esci",
      save: "Salva",
      saved: "Salvato",
    },
    bearings: {
      N: "nord", NE: "nord-est", E: "est", SE: "sud-est",
      S: "sud", SW: "sud-ovest", W: "ovest", NW: "nord-ovest",
    },
    zones: { sensed: "Percepito", called: "Chiamato", found: "Trovato" },
  },
  es: { languageName: "Español" },
  de: { languageName: "Deutsch" },
  el: { languageName: "Ελληνικά" },
  fr: { languageName: "Français" },
  pt: { languageName: "Português" },
};

// Languages other than en/it fall back to English copy with their own native
// name shown in the picker (full translations can be filled in later).
const FALLBACK_BASE = STRINGS.en;

export function t(lang, path, params = {}) {
  const parts = path.split(".");
  const search = (root) => parts.reduce((acc, k) => (acc ? acc[k] : undefined), root);
  let value = search(STRINGS[lang]);
  if (value === undefined) value = search(FALLBACK_BASE);
  if (typeof value !== "string") return value || "";
  return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}

export function languageName(code) {
  return (STRINGS[code] && STRINGS[code].languageName) || code.toUpperCase();
}

export function getOpeningLine(poi, lang) {
  if (!poi || !poi.opening_line) return "";
  return poi.opening_line[lang] || poi.opening_line.en || "";
}

const BEARING_KEYS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export function bearingCardinal(deg) {
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return BEARING_KEYS[idx];
}

export function bearingLabel(lang, deg) {
  return t(lang, `bearings.${bearingCardinal(deg)}`);
}
