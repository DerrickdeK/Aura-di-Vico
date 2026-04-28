import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Bell, Globe, Sparkles } from "lucide-react";

import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t, languageName } from "../lib/i18n";
import { registerServiceWorker, requestNotificationPermission } from "../lib/notifications";

const ALL_INTERESTS = [
  "hidden_gardens", "historic_cafes", "hidden_courtyards",
  "renaissance_traces", "artisan_workshops",
];

function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all ${
            i === step ? "w-8 bg-[var(--terracotta)]" : "w-3 bg-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [supported, setSupported] = useState(["en", "it", "es", "de", "el", "fr", "pt"]);
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(user?.language || "en");
  const [interests, setInterests] = useState(user?.interests || []);
  const [notif, setNotif] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/config")
      .then(({ data }) => data?.supported_languages && setSupported(data.supported_languages))
      .catch(() => {});
  }, []);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/" replace />;

  const toggleInterest = (tag) => {
    setInterests((cur) =>
      cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]
    );
  };

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
        interests,
        notifications_enabled: notif,
        onboarded: true,
      });
      await refresh();
      navigate("/");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const canNextStep = () => {
    if (step === 0) return !!language;
    if (step === 1) return interests.length >= 3 && interests.length <= 5;
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pb-32" data-testid="onboarding-page">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <StepDots step={step} total={3} />

        {step === 0 && (
          <div>
            <p className="eyebrow text-center">{t(language, "onboarding.welcome")}</p>
            <h1 className="font-serif text-5xl text-center mt-3 leading-none">
              {t(language, "onboarding.step1")}
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

        {step === 1 && (
          <div>
            <p className="eyebrow text-center">
              <Sparkles size={12} className="inline mr-1" />
              {t(language, "onboarding.welcome")}
            </p>
            <h1 className="font-serif text-4xl text-center mt-3 leading-tight">
              {t(language, "onboarding.step2")}
            </h1>
            <p className="text-center text-[var(--text-secondary)] mt-2">
              {t(language, "onboarding.pick3to5")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {ALL_INTERESTS.map((tag) => {
                const active = interests.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`px-4 py-2 rounded-full border transition-colors text-sm ${
                      active
                        ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--terracotta)]"
                    }`}
                    data-testid={`onb-interest-${tag}`}
                  >
                    {t(language, `interests.${tag}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs mt-3 text-[var(--text-tertiary)]">
              {interests.length} / 5
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <Bell size={36} strokeWidth={1.2} className="mx-auto text-[var(--terracotta)]" />
            <h1 className="font-serif text-4xl mt-3 leading-tight">
              {t(language, "onboarding.step3")}
            </h1>
            <p className="text-[var(--text-secondary)] mt-3">
              {t(language, "profile.notificationsHint")}
            </p>
            <div className="mt-6 flex flex-col gap-2 items-center">
              <button
                onClick={enableNotifications}
                className="btn-primary"
                disabled={busy || notif}
                data-testid="onb-notif-enable"
              >
                {notif ? "Enabled" : t(language, "onboarding.enable")}
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
        )}

        {error && (
          <p className="text-sm text-[var(--terracotta)] mt-4 text-center">{error}</p>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="btn-ghost"
            disabled={step === 0}
            data-testid="onb-back"
          >
            {t(language, "onboarding.back")}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary inline-flex items-center gap-1.5"
              disabled={!canNextStep()}
              data-testid="onb-next"
            >
              {t(language, "onboarding.next")}
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="btn-primary"
              disabled={busy}
              data-testid="onb-finish"
            >
              {t(language, "onboarding.finish")}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
