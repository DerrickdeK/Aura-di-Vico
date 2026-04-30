import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function RegisterPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asContributor, setAsContributor] = useState(searchParams.get("role") === "contributor");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register", {
        email, password, name, as_contributor: asContributor,
      });
      // Apply the user's chosen UI language to the freshly-created account.
      try { await api.patch("/me/profile", { language: lang }); } catch { /* non-fatal */ }
      await refresh();
      setLoading(false);
      navigate(asContributor ? "/contribute" : "/");
    } catch (err) {
      setLoading(false);
      setError(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  const submitLabel = (() => {
    if (loading) return t(lang, "auth.creating");
    if (asContributor) return t(lang, "auth.becomeContrib");
    return t(lang, "auth.createAccount");
  })();

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 pb-24 relative" data-testid="register-page">
      <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">{t(lang, "auth.beginWandering")}</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">{t(lang, "auth.createAccount")}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            {asContributor
              ? t(lang, "auth.registerContribText")
              : t(lang, "auth.registerWandererText")}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div>
            <label className="eyebrow block mb-2">{t(lang, "auth.yourName")}</label>
            <input
              required
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="register-name"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">{t(lang, "auth.email")}</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">{t(lang, "auth.password")}</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password"
            />
            <p className="text-xs mt-1 text-[var(--text-tertiary)]">{t(lang, "auth.passwordHint")}</p>
          </div>

          <label className="flex items-start gap-3 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={asContributor}
              onChange={(e) => setAsContributor(e.target.checked)}
              className="mt-1 accent-[var(--terracotta)]"
              data-testid="register-contributor-toggle"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {t(lang, "auth.contribCheckbox1")}{" "}
              <strong className="text-[var(--text-primary)]">{t(lang, "auth.contribCheckbox2")}</strong>{" "}
              {t(lang, "auth.contribCheckbox3")}
            </span>
          </label>

          {error && (
            <p className="text-sm text-[var(--terracotta)]" data-testid="register-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="register-submit">
            {submitLabel}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-[var(--text-secondary)]">
          {t(lang, "auth.alreadyAccount")}{" "}
          <Link to="/login" className="text-[var(--terracotta)] font-medium" data-testid="register-go-login">
            {t(lang, "auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
