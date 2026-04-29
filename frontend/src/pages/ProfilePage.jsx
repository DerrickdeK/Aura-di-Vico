import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t, languageName } from "../lib/i18n";
import {
  THEME_TAGS, COMPANION_OPTIONS, ACCESSIBILITY_OPTIONS,
  STATUS_OPTIONS, GENDER_OPTIONS, PROFESSION_OPTIONS,
  RESPONSE_FORMATS, CONTRIBUTION_OPTIONS,
} from "../lib/options";
import { registerServiceWorker, requestNotificationPermission } from "../lib/notifications";

function MultiChips({ values, options, onToggle, lang, kind, testidPrefix }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-4 py-2 rounded-full border text-sm transition-colors ${
              active
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
            data-testid={`${testidPrefix}-${opt}`}
          >
            {t(lang, `${kind}.${opt}`)}
          </button>
        );
      })}
    </div>
  );
}

function RadioChips({ value, options, onChange, lang, kind, testidPrefix }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-4 py-2 rounded-full border text-sm ${
          value == null
            ? "border-[var(--terracotta)] bg-[var(--surface)]"
            : "border-[var(--border)] bg-transparent"
        }`}
        data-testid={`${testidPrefix}-none`}
      >
        {t(lang, "profile.none")}
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-full border text-sm transition-colors ${
            value === opt
              ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
          data-testid={`${testidPrefix}-${opt}`}
        >
          {t(lang, `${kind}.${opt}`)}
        </button>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const [supported, setSupported] = useState(["en", "it", "es", "de", "el", "fr", "pt"]);
  const [language, setLanguage] = useState("en");
  const [relationshipMode, setRelationshipMode] = useState("anonymous");
  const [statusValue, setStatusValue] = useState(null);
  const [genderValue, setGenderValue] = useState(null);
  const [professionValue, setProfessionValue] = useState(null);
  const [professionOther, setProfessionOther] = useState("");
  const [interests, setInterests] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [accessibility, setAccessibility] = useState([]);
  const [responseFormats, setResponseFormats] = useState(["writing"]);
  const [contributions, setContributions] = useState([]);
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
      setRelationshipMode(user.relationship_mode || "anonymous");
      setStatusValue(user.status || null);
      setGenderValue(user.gender || null);
      setProfessionValue(user.profession || null);
      setProfessionOther(user.profession_other || "");
      setInterests(user.interests || []);
      setCompanions(user.companions || []);
      setAccessibility(user.accessibility || []);
      setResponseFormats(user.response_formats?.length ? user.response_formats : ["writing"]);
      setContributions(user.contribution_interests || []);
      setNotif(!!user.notifications_enabled);
    }
  }, [user]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;

  const toggle = (setter) => (item) =>
    setter((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

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
      await api.patch("/me/profile", {
        language,
        relationship_mode: relationshipMode,
        status: relationshipMode === "personal" ? statusValue : null,
        gender: relationshipMode === "personal" ? genderValue : null,
        profession: relationshipMode === "personal" ? professionValue : null,
        profession_other: relationshipMode === "personal" ? professionOther : null,
        interests, companions, accessibility,
        response_formats: responseFormats.length > 0 ? responseFormats : ["writing"],
        contribution_interests: contributions,
        notifications_enabled: notif,
      });
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
      <h1 className="font-serif text-5xl mt-2 leading-none">{t(language, "profile.title")}</h1>
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
        <p className="eyebrow mb-3">{t(language, "profile.relationship")}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setRelationshipMode("anonymous")}
            className={`px-4 py-2 rounded-full border text-sm ${
              relationshipMode === "anonymous"
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
            data-testid="profile-rel-anonymous"
          >{t(language, "onboarding.relationshipAnonymous")}</button>
          <button
            onClick={() => setRelationshipMode("personal")}
            className={`px-4 py-2 rounded-full border text-sm ${
              relationshipMode === "personal"
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
            data-testid="profile-rel-personal"
          >{t(language, "onboarding.relationshipPersonal")}</button>
        </div>
      </section>

      {relationshipMode === "personal" && (
        <section className="mt-8 space-y-5">
          <p className="eyebrow">{t(language, "profile.personalDetails")}</p>
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">status</p>
            <RadioChips value={statusValue} options={STATUS_OPTIONS} onChange={setStatusValue}
              lang={language} kind="status" testidPrefix="profile-status" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">gender</p>
            <RadioChips value={genderValue} options={GENDER_OPTIONS} onChange={setGenderValue}
              lang={language} kind="gender" testidPrefix="profile-gender" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">profession</p>
            <RadioChips value={professionValue} options={PROFESSION_OPTIONS} onChange={setProfessionValue}
              lang={language} kind="profession" testidPrefix="profile-profession" />
            {professionValue === "other" && (
              <input
                className="input-field mt-3"
                placeholder={t(language, "profile.free_text_other")}
                value={professionOther}
                onChange={(e) => setProfessionOther(e.target.value)}
                data-testid="profile-profession-other"
              />
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.themes")}</p>
        <MultiChips values={interests} options={THEME_TAGS} onToggle={toggle(setInterests)}
          lang={language} kind="interests" testidPrefix="profile-theme" />
      </section>

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.companions")}</p>
        <MultiChips values={companions} options={COMPANION_OPTIONS} onToggle={toggle(setCompanions)}
          lang={language} kind="companions" testidPrefix="profile-companion" />
      </section>

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.accessibility")}</p>
        <MultiChips values={accessibility} options={ACCESSIBILITY_OPTIONS} onToggle={toggle(setAccessibility)}
          lang={language} kind="accessibility" testidPrefix="profile-acc" />
      </section>

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.response_formats")}</p>
        <MultiChips values={responseFormats} options={RESPONSE_FORMATS} onToggle={toggle(setResponseFormats)}
          lang={language} kind="response_formats" testidPrefix="profile-format" />
      </section>

      <section className="mt-8">
        <p className="eyebrow mb-3">{t(language, "profile.contributions")}</p>
        <MultiChips values={contributions} options={CONTRIBUTION_OPTIONS} onToggle={toggle(setContributions)}
          lang={language} kind="contribution" testidPrefix="profile-contrib" />
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

      {error && <p className="mt-4 text-sm text-[var(--terracotta)]" data-testid="profile-error">{error}</p>}

      <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
        <button onClick={save} className="btn-primary" disabled={busy} data-testid="profile-save">
          {busy ? "…" : t(language, "profile.save")}
        </button>
        {savedAt > 0 && (
          <span className="text-xs text-[var(--text-tertiary)]" data-testid="profile-saved">
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
