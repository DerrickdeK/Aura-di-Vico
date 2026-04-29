import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Bell, Globe, Sparkles, UserRound, ShieldCheck, Footprints } from "lucide-react";

import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t, languageName } from "../lib/i18n";
import {
  THEME_TAGS, COMPANION_OPTIONS, ACCESSIBILITY_OPTIONS,
  STATUS_OPTIONS, GENDER_OPTIONS, PROFESSION_OPTIONS,
  RESPONSE_FORMATS, CONTRIBUTION_OPTIONS,
} from "../lib/options";
import { registerServiceWorker, requestNotificationPermission } from "../lib/notifications";

const WIZARD_INITIAL = { opacity: 0, y: 12 };
const WIZARD_ANIMATE = { opacity: 1, y: 0 };

function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={`step-${i}`}
          className={`h-1 rounded-full transition-all ${
            i === current ? "w-8 bg-[var(--terracotta)]" : "w-3 bg-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

function ChipMulti({ values, options, current, onToggle, lang, kind, testidPrefix }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {options.map((opt) => {
        const active = current.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-4 py-2 rounded-full border transition-colors text-sm ${
              active
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--terracotta)]"
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

function ChipRadio({ value, options, onChange, lang, kind, testidPrefix }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-4 py-2 rounded-full border transition-colors text-sm ${
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
          className={`px-4 py-2 rounded-full border transition-colors text-sm ${
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

export default function OnboardingPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [supported, setSupported] = useState(["en", "it", "es", "de", "el", "fr", "pt"]);
  const [step, setStep] = useState(0);

  // Form state
  const [language, setLanguage] = useState(user?.language || "en");
  const [relationshipMode, setRelationshipMode] = useState(user?.relationship_mode || "anonymous");
  const [statusValue, setStatusValue] = useState(user?.status || null);
  const [genderValue, setGenderValue] = useState(user?.gender || null);
  const [professionValue, setProfessionValue] = useState(user?.profession || null);
  const [professionOther, setProfessionOther] = useState(user?.profession_other || "");
  const [interests, setInterests] = useState(user?.interests || []);
  const [companions, setCompanions] = useState(user?.companions || []);
  const [accessibility, setAccessibility] = useState(user?.accessibility || []);
  const [responseFormats, setResponseFormats] = useState(user?.response_formats || ["writing"]);
  const [contributions, setContributions] = useState(user?.contribution_interests || []);
  const [notif, setNotif] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/config")
      .then(({ data }) => data?.supported_languages && setSupported(data.supported_languages))
      .catch(() => {});
  }, []);

  // Steps the wizard will iterate through. Anonymous users skip the personal step.
  const steps = useMemo(() => {
    const all = ["language", "identity", "personal", "preferences", "context", "format", "contribute"];
    if (relationshipMode === "anonymous") return all.filter((s) => s !== "personal");
    return all;
  }, [relationshipMode]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/" replace />;

  const currentStep = steps[step];

  const toggle = (setter) => (item) =>
    setter((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

  const enableNotifications = async () => {
    setBusy(true);
    await registerServiceWorker();
    const permission = await requestNotificationPermission();
    setNotif(permission === "granted");
    setBusy(false);
  };

  const finish = async () => {
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
        interests,
        companions,
        accessibility,
        response_formats: responseFormats.length > 0 ? responseFormats : ["writing"],
        contribution_interests: contributions,
        notifications_enabled: notif,
        onboarded: true,
      });
      await refresh();
      navigate("/listen");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const isLast = step === steps.length - 1;
  const goNext = () => (isLast ? finish() : setStep((s) => Math.min(steps.length - 1, s + 1)));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 pb-32" data-testid="onboarding-page">
      <motion.div
        initial={WIZARD_INITIAL}
        animate={WIZARD_ANIMATE}
        className="w-full max-w-md"
      >
        <StepDots current={step} total={steps.length} />

        {currentStep === "language" && (
          <div>
            <p className="eyebrow text-center">{t(language, "onboarding.welcome")}</p>
            <h1 className="font-serif text-5xl text-center mt-3 leading-none">
              {t(language, "onboarding.step_language")}
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 text-[var(--text-tertiary)]">
              <Globe size={14} strokeWidth={1.5} />
              <span className="text-sm">{languageName(language)}</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {supported.map((code) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`px-4 py-3 rounded-2xl border text-left transition-colors ${
                    language === code
                      ? "border-[var(--terracotta)] bg-[var(--surface)]"
                      : "border-[var(--border)] bg-transparent hover:bg-[var(--surface)]"
                  }`}
                  data-testid={`onb-lang-${code}`}
                >
                  <div className="font-serif text-lg leading-none">{languageName(code)}</div>
                  <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mt-1">
                    {code}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === "identity" && (
          <div>
            <ShieldCheck size={28} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step_identity")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.step_identity_hint")}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => setRelationshipMode("anonymous")}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  relationshipMode === "anonymous"
                    ? "border-[var(--terracotta)] bg-[var(--surface)]"
                    : "border-[var(--border)] bg-transparent"
                }`}
                data-testid="onb-rel-anonymous"
              >
                <div className="font-serif text-lg">{t(language, "onboarding.relationshipAnonymous")}</div>
              </button>
              <button
                onClick={() => setRelationshipMode("personal")}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  relationshipMode === "personal"
                    ? "border-[var(--terracotta)] bg-[var(--surface)]"
                    : "border-[var(--border)] bg-transparent"
                }`}
                data-testid="onb-rel-personal"
              >
                <div className="font-serif text-lg">{t(language, "onboarding.relationshipPersonal")}</div>
              </button>
            </div>
          </div>
        )}

        {currentStep === "personal" && (
          <div>
            <UserRound size={28} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step_personal")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.step_personal_hint")}
            </p>

            <div className="mt-6">
              <p className="eyebrow mb-2 text-center">{t(language, "profile.personalDetails")} · status</p>
              <ChipRadio
                value={statusValue} options={STATUS_OPTIONS} onChange={setStatusValue}
                lang={language} kind="status" testidPrefix="onb-status"
              />
            </div>
            <div className="mt-5">
              <p className="eyebrow mb-2 text-center">gender</p>
              <ChipRadio
                value={genderValue} options={GENDER_OPTIONS} onChange={setGenderValue}
                lang={language} kind="gender" testidPrefix="onb-gender"
              />
            </div>
            <div className="mt-5">
              <p className="eyebrow mb-2 text-center">profession</p>
              <ChipRadio
                value={professionValue} options={PROFESSION_OPTIONS} onChange={setProfessionValue}
                lang={language} kind="profession" testidPrefix="onb-profession"
              />
              {professionValue === "other" && (
                <input
                  className="input-field mt-3"
                  placeholder={t(language, "profile.free_text_other")}
                  value={professionOther}
                  onChange={(e) => setProfessionOther(e.target.value)}
                  data-testid="onb-profession-other"
                />
              )}
            </div>
          </div>
        )}

        {currentStep === "preferences" && (
          <div>
            <Sparkles size={28} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step_preferences")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.step_preferences_hint")}
            </p>
            <div className="mt-6">
              <p className="eyebrow mb-2 text-center">{t(language, "onboarding.themesTitle")}</p>
              <ChipMulti
                values={interests} options={THEME_TAGS} current={interests}
                onToggle={toggle(setInterests)}
                lang={language} kind="interests" testidPrefix="onb-theme"
              />
            </div>
          </div>
        )}

        {currentStep === "context" && (
          <div>
            <Footprints size={28} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step_context")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.step_context_hint")}
            </p>
            <div className="mt-6">
              <p className="eyebrow mb-2 text-center">{t(language, "onboarding.companionsTitle")}</p>
              <ChipMulti
                values={companions} options={COMPANION_OPTIONS} current={companions}
                onToggle={toggle(setCompanions)}
                lang={language} kind="companions" testidPrefix="onb-companion"
              />
            </div>
            <div className="mt-5">
              <p className="eyebrow mb-2 text-center">{t(language, "onboarding.accessibilityTitle")}</p>
              <ChipMulti
                values={accessibility} options={ACCESSIBILITY_OPTIONS} current={accessibility}
                onToggle={toggle(setAccessibility)}
                lang={language} kind="accessibility" testidPrefix="onb-acc"
              />
            </div>
          </div>
        )}

        {currentStep === "format" && (
          <div>
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step_format")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.step_format_hint")}
            </p>
            <div className="mt-6">
              <ChipMulti
                values={responseFormats} options={RESPONSE_FORMATS} current={responseFormats}
                onToggle={toggle(setResponseFormats)}
                lang={language} kind="response_formats" testidPrefix="onb-format"
              />
            </div>
          </div>
        )}

        {currentStep === "contribute" && (
          <div>
            <Bell size={28} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step_contribute")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.step_contribute_hint")}
            </p>
            <div className="mt-6">
              <ChipMulti
                values={contributions} options={CONTRIBUTION_OPTIONS} current={contributions}
                onToggle={toggle(setContributions)}
                lang={language} kind="contribution" testidPrefix="onb-contrib"
              />
            </div>

            <div className="mt-10 pt-8 border-t border-[var(--border)]">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 text-center">
                <p className="eyebrow mb-2">One last thing</p>
                <p className="font-serif text-xl">{t(language, "profile.notifications")}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {t(language, "profile.notificationsHint")}
                </p>
                <div className="mt-4 flex gap-2 justify-center">
                  <button
                    onClick={enableNotifications}
                    className="btn-primary"
                    disabled={busy || notif}
                    data-testid="onb-notif-enable"
                  >
                    {notif ? "✓" : t(language, "onboarding.enable")}
                  </button>
                  <button
                    onClick={() => setNotif(false)}
                    className="btn-ghost"
                    data-testid="onb-notif-skip"
                  >
                    {t(language, "onboarding.skip")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--terracotta)] mt-4 text-center" data-testid="onb-error">{error}</p>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <button
            onClick={goBack}
            className="btn-ghost"
            disabled={step === 0}
            data-testid="onb-back"
          >
            {t(language, "onboarding.back")}
          </button>
          <button
            onClick={goNext}
            className="btn-primary inline-flex items-center gap-1.5"
            disabled={busy}
            data-testid={isLast ? "onb-finish" : "onb-next"}
          >
            {isLast ? t(language, "onboarding.finish") : t(language, "onboarding.next")}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
