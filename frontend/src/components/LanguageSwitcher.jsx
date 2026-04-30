import React from "react";
import useLocale from "../hooks/useLocale";

const PRIMARY = ["it", "en"];

/**
 * Tiny IT | EN pill switcher for the top-right of every page. Stores choice
 * in localStorage for anonymous users and persists to profile when logged in.
 */
export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang } = useLocale();
  return (
    <div
      className={`inline-flex items-center gap-0.5 bg-[var(--surface)]/80 backdrop-blur border border-[var(--border)] rounded-full px-1 py-1 text-[11px] tracking-widest uppercase ${className}`}
      data-testid="language-switcher"
    >
      {PRIMARY.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-2.5 py-0.5 rounded-full transition-colors ${
            lang === code
              ? "bg-[var(--terracotta)] text-[var(--inverse)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
          data-testid={`language-switcher-${code}`}
          aria-label={code === "it" ? "Italiano" : "English"}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
