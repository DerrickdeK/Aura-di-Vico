import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Sparkles, Check, X as XIcon, BookOpen, MessageCircle, Image, Trash2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

const TYPES = [
  { key: "narrative",       label: "Narrative",        icon: BookOpen,      hint: "A short story, anecdote, or local memory tied to this place (max 4000 chars)." },
  { key: "dialogue_prompt", label: "Dialogue prompt",  icon: MessageCircle, hint: "A question the visitor could ask this place — used to seed AI dialogue later." },
  { key: "fun_fact",        label: "Fun fact",         icon: Sparkles,      hint: "One surprising line that makes the visitor smile." },
  { key: "photo_url",       label: "Photo URL",        icon: Image,         hint: "A direct image URL (uploads coming soon)." },
];

const STATUS_BADGE = {
  pending:  { label: "Pending review",  className: "bg-[var(--warm-ochre)]/15 text-[var(--warm-ochre)] border-[var(--warm-ochre)]/40" },
  approved: { label: "Live",            className: "bg-[var(--deep-green)]/15 text-[var(--deep-green)] border-[var(--deep-green)]/40" },
  rejected: { label: "Not used",        className: "bg-[var(--terracotta)]/15 text-[var(--terracotta)] border-[var(--terracotta)]/40" },
};

function StatusBadge({ status }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return (
    <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 ${meta.className}`} data-testid={`contribution-status-${status}`}>
      {meta.label}
    </span>
  );
}

function ContributionForm({ pois, onSubmitted }) {
  const [poiId, setPoiId] = useState("");
  const [type, setType] = useState("narrative");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!poiId) { setError("Please pick a POI."); return; }
    setBusy(true);
    try {
      await api.post("/contributions", {
        poi_id: poiId,
        type,
        content: content.trim(),
        title: title.trim() || null,
      });
      setSuccess(true);
      setContent("");
      setTitle("");
      onSubmitted?.();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const typeMeta = TYPES.find((t) => t.key === type);

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
      data-testid="contribution-form"
    >
      <div>
        <label className="eyebrow block mb-2">Point of interest</label>
        <select
          value={poiId}
          onChange={(e) => setPoiId(e.target.value)}
          className="input-field"
          required
          data-testid="contribution-poi-select"
        >
          <option value="">— pick a place in Brera —</option>
          {pois.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="eyebrow block mb-2">Type of contribution</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.key;
            return (
              <button
                type="button"
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs transition-colors ${
                  active
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]"
                }`}
                data-testid={`contribution-type-${t.key}`}
              >
                <Icon size={16} strokeWidth={1.6} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">{typeMeta?.hint}</p>
      </div>

      <div>
        <label className="eyebrow block mb-2">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          maxLength={120}
          placeholder="e.g., Nonna's recipe for risotto al salto"
          data-testid="contribution-title"
        />
      </div>

      <div>
        <label className="eyebrow block mb-2">
          {type === "photo_url" ? "Image URL" : "Your contribution"}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input-field min-h-[120px]"
          required
          minLength={2}
          maxLength={4000}
          placeholder={
            type === "photo_url"
              ? "https://…"
              : type === "dialogue_prompt"
              ? "What would you ask this place if it could answer?"
              : "Write a few lines visitors should hear…"
          }
          data-testid="contribution-content"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{content.length}/4000</p>
      </div>

      {error && <p className="text-sm text-[var(--terracotta)]" data-testid="contribution-error">{error}</p>}
      {success && (
        <p className="text-sm text-[var(--deep-green)]" data-testid="contribution-success">
          Submitted — an admin will review it shortly. Grazie!
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="contribution-submit">
        {busy ? "Submitting…" : "Submit contribution"}
      </button>
    </form>
  );
}

function ContributionRow({ c, onDelete }) {
  return (
    <li
      className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]"
      data-testid={`my-contribution-${c.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            {c.type.replace("_", " ")} · {c.poi?.name || "Unknown POI"}
          </p>
          {c.title && <p className="font-serif text-lg mt-1">{c.title}</p>}
          <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{c.content}</p>
          {c.moderation_note && (
            <p className="text-xs italic mt-2 text-[var(--text-tertiary)]">
              Note from admin: {c.moderation_note}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={c.status} />
          {c.status === "pending" && (
            <button
              onClick={() => onDelete(c.id)}
              className="text-xs text-[var(--text-tertiary)] inline-flex items-center gap-1 hover:text-[var(--terracotta)]"
              data-testid={`my-contribution-delete-${c.id}`}
            >
              <Trash2 size={12} /> withdraw
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ContributePage() {
  const { user } = useAuth();
  const [pois, setPois] = useState([]);
  const [mine, setMine] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.get("/pois").then(({ data }) => setPois(data)).catch(() => setPois([]));
  }, []);

  useEffect(() => {
    if (!user || user === false) return;
    api.get("/contributions/mine").then(({ data }) => setMine(data)).catch(() => setMine([]));
  }, [user, reloadKey]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login?next=/contribute" replace />;

  const isContributor = user.role === "contributor" || user.role === "admin";

  if (!isContributor) {
    return (
      <div className="min-h-screen px-5 pt-12 pb-32 max-w-xl mx-auto text-center" data-testid="contribute-not-allowed">
        <p className="eyebrow">Curators only</p>
        <h1 className="font-serif text-4xl mt-2">Want to give Brera your voice?</h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          Contributions are reserved for invited students &amp; curators. Sign up with the
          contributor option, or ask an admin to upgrade your account.
        </p>
        <Link to="/register?role=contributor" className="btn-primary inline-block mt-6" data-testid="become-contributor-cta">
          Become a contributor
        </Link>
      </div>
    );
  }

  const onDelete = async (id) => {
    if (!window.confirm("Withdraw this contribution?")) return;
    try {
      await api.delete(`/contributions/${id}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      window.alert(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto" data-testid="contribute-page">
      <p className="eyebrow">Contribute</p>
      <h1 className="font-serif text-5xl mt-2 leading-none">Give Brera a new voice</h1>
      <p className="mt-3 text-[var(--text-secondary)] max-w-lg">
        Add the narratives, fun facts, and dialogue prompts that the city will whisper to
        future walkers. Each contribution is reviewed by an admin before going live.
      </p>

      <section className="mt-8">
        <ContributionForm pois={pois} onSubmitted={() => setReloadKey((k) => k + 1)} />
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Your contributions</h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {mine.length} total · {mine.filter((c) => c.status === "approved").length} live
        </p>
        {mine.length === 0 ? (
          <p className="mt-4 text-[var(--text-secondary)]">
            Nothing yet. Pick a place above and tell its story.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {mine.map((c) => (
              <ContributionRow key={c.id} c={c} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </section>

      {user.role === "admin" && (
        <div className="mt-10 text-center">
          <Link to="/admin/contributions" className="text-[var(--terracotta)] underline" data-testid="contribute-go-moderation">
            Open moderation queue →
          </Link>
        </div>
      )}
    </div>
  );
}

export { ContributionRow, StatusBadge };
