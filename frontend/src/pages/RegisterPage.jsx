import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await register(email, password, name);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 pb-24" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">Begin wandering</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">Create an account</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Save the courtyards, cafés, and oddities you discover.
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
          {error && (
            <p className="text-sm text-[var(--terracotta)]" data-testid="register-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="register-submit">
            {loading ? "Creating…" : "Create account"}
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
