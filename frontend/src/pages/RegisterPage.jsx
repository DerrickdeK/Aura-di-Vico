import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function RegisterPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      await refresh();
      setLoading(false);
      navigate(asContributor ? "/contribute" : "/");
    } catch (err) {
      setLoading(false);
      setError(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 pb-24" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">Begin wandering</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">Create an account</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            {asContributor
              ? "Curate Brera with your students. Your contributions go through admin review."
              : "Save the courtyards, cafés, and oddities you discover."}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div>
            <label className="eyebrow block mb-2">Your name</label>
            <input
              required
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="register-name"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">Email</label>
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
            <label className="eyebrow block mb-2">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password"
            />
            <p className="text-xs mt-1 text-[var(--text-tertiary)]">At least 6 characters.</p>
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
              I'd like to <strong className="text-[var(--text-primary)]">contribute</strong> narratives, fun facts, or
              dialogue prompts to Brera. (Each contribution is moderated.)
            </span>
          </label>

          {error && (
            <p className="text-sm text-[var(--terracotta)]" data-testid="register-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="register-submit">
            {loading ? "Creating…" : asContributor ? "Become a contributor" : "Create account"}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-[var(--text-secondary)]">
          Already have one?{" "}
          <Link to="/login" className="text-[var(--terracotta)] font-medium" data-testid="register-go-login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
