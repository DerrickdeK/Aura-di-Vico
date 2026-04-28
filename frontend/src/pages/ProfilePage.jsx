import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t, languageName } from "../lib/i18n";
import { registerServiceWorker, requestNotificationPermission } from "../lib/notifications";

const ALL_INTERESTS = [
  "hidden_gardens", "historic_cafes", "hidden_courtyards",
  "renaissance_traces", "artisan_workshops",
];

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const [supported, setSupported] = useState(["en", "it", "es", "de", "el", "fr", "pt"]);
  const [language, setLanguage] = useState("en");
  const [interests, setInterests] = useState([]);
  const [notif, setNotif] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/config")
      .then(({ data }) => data?.supported_languages && setSupported(data.supported_languages))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user && user !== false) {
      setLanguage(user.language || "en");
      setInterests(user.interests || []);
      setNotif(!!user.notifications_enabled);
    }
  }, [user]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;

  const toggleInterest = (tag) => {
    setInterests((cur) =>
      cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]
    );
  };

  const enableNotif = async () => {
    setBusy(true);
    await registerServiceWorker();
    const permission = await requestNotificationPermission();
    setNotif(permission === "granted");
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.patch("/me/profile", { language, interests, notifications_enabled: notif });
      await refresh();
      setSavedAt(Date.now());
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-xl mx-auto" data-testid="profile-page">
      <p className="eyebrow">Settings</p>
      <h1 className="font-serif text-5xl mt-2 leading-none">
        {t(language, "profile.title")}
      </h1>
      <p className="mt-3 text-[var(--text-secondary)]">{user.name} · {user.email}</p>

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.language")}</p>
        <div className="grid grid-cols-2 gap-2">
          {supported.map((code) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`px-4 py-3 rounded-2xl border text-left transition-colors ${
                language === code
                  ? "border-[var(--terracotta)] bg-[var(--surface)]"
                  : "border-[var(--border)] bg-transparent hover:bg-[var(--surface)]"
              }`}
              data-testid={`profile-lang-${code}`}
            >
              <div className="font-serif text-lg leading-none">{languageName(code)}</div>
              <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{code}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.interests")}</p>
        <div className="flex flex-wrap gap-2">
          {ALL_INTERESTS.map((tag) => {
            const active = interests.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleInterest(tag)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                  active
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
                data-testid={`profile-interest-${tag}`}
              >
                {t(language, `interests.${tag}`)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
        <p className="font-serif text-xl">{t(language, "profile.notifications")}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t(language, "profile.notificationsHint")}
        </p>
        <button
          onClick={notif ? () => setNotif(false) : enableNotif}
          className={notif ? "btn-ghost mt-4" : "btn-primary mt-4"}
          disabled={busy}
          data-testid="profile-notif-toggle"
        >
          {notif ? "Disable" : "Enable"}
        </button>
      </section>

      {error && <p className="mt-4 text-sm text-[var(--terracotta)]">{error}</p>}

      <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
        <button onClick={save} className="btn-primary" disabled={busy} data-testid="profile-save">
          {busy ? "…" : t(language, "profile.save")}
        </button>
        {savedAt > 0 && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {t(language, "profile.saved")} ✓
          </span>
        )}
        <button onClick={logout} className="btn-ghost inline-flex items-center gap-2" data-testid="profile-logout">
          <LogOut size={14} /> {t(language, "profile.logout")}
        </button>
      </div>

      {user.role === "admin" && (
        <div className="mt-10 text-center">
          <Link to="/admin" className="text-[var(--terracotta)] underline" data-testid="profile-admin-link">
            Open admin dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
