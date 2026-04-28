import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 pb-24" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">Brera · Milano</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">Welcome back</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Sign in to save discoveries and track your wanderings.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div>
            <label className="eyebrow block mb-2">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--terracotta)]" data-testid="login-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="login-submit">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-[var(--text-secondary)]">
          New here?{" "}
          <Link to="/register" className="text-[var(--terracotta)] font-medium" data-testid="login-go-register">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
