import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { devWarn } from "../lib/log";

const STORAGE_KEY = "brera-lang";
const SUPPORTED = ["it", "en", "es", "de", "el", "fr", "pt"];
const DEFAULT_LANG = "it"; // Italian-first, per project audience.

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED.includes(v)) return v;
  } catch (err) {
    devWarn("localStorage read failed:", err);
  }
  return null;
}

function writeStored(v) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch (err) { devWarn("localStorage write failed:", err); }
}

/**
 * Returns { lang, setLang } — the active UI language across anonymous and
 * logged-in flows. Logged-in users persist via the /me/profile endpoint;
 * anonymous users persist via localStorage. Default = Italian.
 */
export default function useLocale() {
  const { user, refresh } = useAuth();
  const [lang, setLangState] = useState(readStored() || DEFAULT_LANG);

  // When the user logs in, prefer their saved language.
  useEffect(() => {
    if (user && user !== false && user.language && user.language !== lang) {
      setLangState(user.language);
      writeStored(user.language);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = useCallback(async (next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    writeStored(next);
    if (user && user !== false) {
      try {
        await api.patch("/me/profile", { language: next });
        await refresh();
      } catch (err) {
        devWarn("Failed to persist language:", err);
      }
    }
  }, [user, refresh]);

  return { lang, setLang, supported: SUPPORTED };
}
