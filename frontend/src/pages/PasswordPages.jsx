import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Small bilingual copy specific to the password-reset flow. Kept local here
// because it's only used on these two pages — no need to grow i18n.js.
const COPY = {
  it: {
    forgot: {
      eyebrow: "Password smarrita",
      title: "Ti rimanderemo in cammino",
      lead: "Scrivi l'email del tuo account. Se la troviamo, ti invieremo un link per scegliere una nuova password. Il link sarà valido per un'ora.",
      email: "Email",
      submit: "Invia link",
      submitting: "Invio…",
      success: "Se questa email è registrata, ti abbiamo inviato un link. Controlla la posta.",
      backLogin: "Torna al login",
    },
    reset: {
      eyebrow: "Nuova password",
      title: "Scegli una nuova password",
      lead: "Questa sostituirà la precedente. Almeno 6 caratteri.",
      password: "Nuova password",
      confirm: "Conferma password",
      mismatch: "Le password non coincidono.",
      submit: "Reimposta password",
      submitting: "Reimpostazione…",
      success: "Fatto. Ora puoi accedere con la nuova password.",
      goLogin: "Vai al login",
      missingToken: "Link non valido. Richiedi un nuovo reset.",
    },
  },
  en: {
    forgot: {
      eyebrow: "Password lost",
      title: "We'll put you back on the path",
      lead: "Enter your account email. If we find it, we'll send you a link to choose a new password. The link is valid for one hour.",
      email: "Email",
      submit: "Send reset link",
      submitting: "Sending…",
      success: "If that email is registered, we've sent you a link. Check your inbox.",
      backLogin: "Back to sign in",
    },
    reset: {
      eyebrow: "New password",
      title: "Choose a new password",
      lead: "This will replace the previous one. At least 6 characters.",
      password: "New password",
      confirm: "Confirm password",
      mismatch: "Passwords don't match.",
      submit: "Reset password",
      submitting: "Resetting…",
      success: "Done. You can now sign in with your new password.",
      goLogin: "Go to sign in",
      missingToken: "Invalid link. Please request a new reset.",
    },
  },
};

export function ForgotPasswordPage() {
  const { lang } = useLocale();
  const copy = (COPY[lang] || COPY.en).forgot;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 pb-24 relative" data-testid="forgot-page">
      <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">{copy.title}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">{copy.lead}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div>
            <label className="eyebrow block mb-2">{copy.email}</label>
            <input
              type="email" required autoComplete="email"
              className="input-field" value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sent}
              data-testid="forgot-email"
            />
          </div>
          {error && <p className="text-sm text-[var(--terracotta)]" data-testid="forgot-error">{error}</p>}
          {sent && <p className="text-sm text-[var(--deep-green)]" data-testid="forgot-success">{copy.success}</p>}
          {!sent && (
            <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="forgot-submit">
              {loading ? copy.submitting : copy.submit}
            </button>
          )}
        </form>
        <p className="text-center mt-6 text-sm text-[var(--text-secondary)]">
          <Link to="/login" className="text-[var(--terracotta)] font-medium" data-testid="forgot-go-login">
            {copy.backLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { lang } = useLocale();
  const copy = (COPY[lang] || COPY.en).reset;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-[var(--terracotta)]">{copy.missingToken}</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(copy.mismatch); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 pb-24 relative" data-testid="reset-page">
      <div className="absolute top-5 right-5"><LanguageSwitcher /></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">{copy.title}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">{copy.lead}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div>
            <label className="eyebrow block mb-2">{copy.password}</label>
            <input
              type="password" required minLength={6} autoComplete="new-password"
              className="input-field" value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="reset-password"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">{copy.confirm}</label>
            <input
              type="password" required minLength={6}
              className="input-field" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="reset-confirm"
            />
          </div>
          {error && <p className="text-sm text-[var(--terracotta)]" data-testid="reset-error">{error}</p>}
          {success && <p className="text-sm text-[var(--deep-green)]" data-testid="reset-success">{copy.success}</p>}
          {!success && (
            <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="reset-submit">
              {loading ? copy.submitting : copy.submit}
            </button>
          )}
          {success && (
            <Link to="/login" className="btn-ghost w-full block text-center" data-testid="reset-go-login">
              {copy.goLogin}
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
