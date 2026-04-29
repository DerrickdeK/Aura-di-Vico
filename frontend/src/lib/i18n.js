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
      step_language: "Choose your language",
      step_identity: "Who are we talking to?",
      step_identity_hint: "Brera will adapt how it speaks to you. Skip anything you'd rather keep private.",
      step_personal: "A little about you",
      step_personal_hint: "All optional — leave blank what you don't wish to share.",
      step_preferences: "What would you like the city to whisper about?",
      step_preferences_hint: "Pick what calls to you. Leave blank for everything.",
      step_context: "How are you wandering today?",
      step_context_hint: "This helps Brera shape the route and tone.",
      step_format: "How should the city respond?",
      step_format_hint: "You can tick more than one. Choose nothing and Brera will only whisper in writing.",
      step_contribute: "Would you like to give back?",
      step_contribute_hint: "Optional — say nothing if you'd rather just listen.",
      relationship: "How would you like to be known to Brera?",
      relationshipAnonymous: "Anonymous — keep it simple",
      relationshipPersonal: "Personal — let Brera tailor its voice",
      themesTitle: "Themes",
      companionsTitle: "Going around",
      accessibilityTitle: "Pace & accessibility",
      finish: "Begin listening",
      next: "Next",
      back: "Back",
      skip: "Skip",
      pick3to5: "Pick 3 to 5 themes.",
      enable: "Enable background calls",
    },

    interests: {
      local_legends: "Local legends",
      curios: "Curiosities",
      art: "Art",
      history: "History",
      architecture: "Architecture",
      sceneries: "Sceneries",
      food: "Food",
      shopping: "Shopping",
    },
    companions: {
      alone: "On my own",
      with_partner: "With my partner",
      with_family: "With family / children",
      with_friends_or_group: "With friends or a group",
      with_guide: "On a guided tour",
    },
    accessibility: {
      walking_freely: "Walking freely",
      limited_stamina: "Slow pace / limited stamina",
      wheelchair: "Using a wheelchair",
      stroller: "With a stroller or pram",
      with_assistant: "With a personal assistant",
      prefer_not_to_say: "Prefer not to say",
    },
    status: {
      citizen: "Citizen of Milan",
      visitor: "Visitor",
      guest: "Guest",
      tourist: "Tourist",
      other: "Other",
    },
    gender: {
      male: "Male",
      female: "Female",
      non_binary: "Non-binary",
      prefer_not_to_say: "Prefer not to say",
    },
    profession: {
      student: "Student",
      researcher: "Researcher",
      employee: "Employee",
      manual_craft: "Manual / craft worker",
      self_employed_professional: "Self-employed professional",
      retired: "Retired",
      other: "Other",
    },
    response_formats: {
      writing: "Writing",
      voice: "Voice",
      image: "Image",
      dialogue: "AI-supported dialogue",
    },
    contribution: {
      identify: "Identify a place",
      illustrate: "Share photos",
      narrate: "Record a whisper",
      create_poi: "Suggest a new POI",
    },

    profile: {
      title: "Your profile",
      language: "Language",
      relationship: "How Brera knows you",
      personalDetails: "Personal details",
      themes: "Themes",
      companions: "Going around",
      accessibility: "Pace & accessibility",
      response_formats: "How the city responds",
      contributions: "Willing to contribute",
      notifications: "Background calls",
      notificationsHint: "Allow the city to whisper even when the app is closed.",
      logout: "Sign out",
      save: "Save",
      saved: "Saved",
      none: "—",
      free_text_other: "If 'Other', describe in a few words",
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
      step_language: "Scegli la lingua",
      step_identity: "Con chi stiamo parlando?",
      step_identity_hint: "Brera adatterà il modo in cui ti parla. Salta ciò che preferisci tenere per te.",
      step_personal: "Un po' su di te",
      step_personal_hint: "Tutto facoltativo — lascia in bianco ciò che non vuoi condividere.",
      step_preferences: "Di cosa dovrebbe sussurrarti la città?",
      step_preferences_hint: "Scegli ciò che ti chiama. Lascia in bianco per tutto.",
      step_context: "Come stai vagando oggi?",
      step_context_hint: "Aiuta Brera a regolare percorso e tono.",
      step_format: "Come dovrebbe risponderti la città?",
      step_format_hint: "Puoi scegliere più di una. Senza nulla, Brera sussurrerà solo per iscritto.",
      step_contribute: "Vuoi contribuire?",
      step_contribute_hint: "Facoltativo — non dire nulla se preferisci solo ascoltare.",
      relationship: "Come vuoi essere conosciuto da Brera?",
      relationshipAnonymous: "Anonimo — facile e veloce",
      relationshipPersonal: "Personale — lascia che Brera adatti la voce",
      themesTitle: "Temi",
      companionsTitle: "In compagnia di",
      accessibilityTitle: "Ritmo e accessibilità",
      finish: "Inizia ad ascoltare",
      next: "Avanti",
      back: "Indietro",
      skip: "Salta",
      pick3to5: "Scegli da 3 a 5 temi.",
      enable: "Attiva le chiamate in background",
    },

    interests: {
      local_legends: "Leggende locali",
      curios: "Curiosità",
      art: "Arte",
      history: "Storia",
      architecture: "Architettura",
      sceneries: "Scorci",
      food: "Cibo",
      shopping: "Shopping",
    },
    companions: {
      alone: "Da solo/a",
      with_partner: "Con il/la partner",
      with_family: "Con la famiglia / bambini",
      with_friends_or_group: "Con amici o un gruppo",
      with_guide: "Con una guida",
    },
    accessibility: {
      walking_freely: "Cammino liberamente",
      limited_stamina: "Ritmo lento / stamina limitata",
      wheelchair: "In sedia a rotelle",
      stroller: "Con passeggino",
      with_assistant: "Con un assistente",
      prefer_not_to_say: "Preferisco non dirlo",
    },
    status: {
      citizen: "Cittadino milanese",
      visitor: "Visitatore",
      guest: "Ospite",
      tourist: "Turista",
      other: "Altro",
    },
    gender: {
      male: "Uomo",
      female: "Donna",
      non_binary: "Non-binary",
      prefer_not_to_say: "Preferisco non dirlo",
    },
    profession: {
      student: "Studente/essa",
      researcher: "Ricercatore/trice",
      employee: "Lavoratore/trice dipendente",
      manual_craft: "Mestiere manuale / artigiano",
      self_employed_professional: "Libero/a professionista",
      retired: "In pensione",
      other: "Altro",
    },
    response_formats: {
      writing: "Scritto",
      voice: "Voce",
      image: "Immagini",
      dialogue: "Dialogo con AI",
    },
    contribution: {
      identify: "Identificare un luogo",
      illustrate: "Condividere foto",
      narrate: "Registrare un sussurro",
      create_poi: "Suggerire un nuovo POI",
    },

    profile: {
      title: "Il tuo profilo",
      language: "Lingua",
      relationship: "Come Brera ti conosce",
      personalDetails: "Dati personali",
      themes: "Temi",
      companions: "In compagnia di",
      accessibility: "Ritmo e accessibilità",
      response_formats: "Come risponde la città",
      contributions: "Disposto a contribuire",
      notifications: "Chiamate in background",
      notificationsHint: "Permetti alla città di sussurrare anche con l'app chiusa.",
      logout: "Esci",
      save: "Salva",
      saved: "Salvato",
      none: "—",
      free_text_other: "Se 'Altro', descrivi in poche parole",
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
