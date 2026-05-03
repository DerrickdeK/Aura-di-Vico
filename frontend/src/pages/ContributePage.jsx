import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Sparkles, BookOpen, MessageCircle, Image, Trash2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";

const TYPE_KEYS = [
  { key: "narrative",       icon: BookOpen },
  { key: "dialogue_prompt", icon: MessageCircle },
  { key: "fun_fact",        icon: Sparkles },
  { key: "photo_url",       icon: Image },
];

function StatusBadge({ status }) {
  const { lang } = useLocale();
  const palette = {
    pending:  "bg-[var(--warm-ochre)]/15 text-[var(--warm-ochre)] border-[var(--warm-ochre)]/40",
    approved: "bg-[var(--deep-green)]/15 text-[var(--deep-green)] border-[var(--deep-green)]/40",
    rejected: "bg-[var(--terracotta)]/15 text-[var(--terracotta)] border-[var(--terracotta)]/40",
    auto_blocked: "bg-[var(--ink)]/15 text-[var(--ink)] border-[var(--ink)]/40",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 ${palette[status] || palette.pending}`}
      data-testid={`contribution-status-${status}`}
    >
      {t(lang, `contribute.status.${status}`)}
    </span>
  );
}

function ContributionForm({ pois, onSubmitted }) {
  const { lang } = useLocale();
  const [poiId, setPoiId] = useState("");
  const [type, setType] = useState("narrative");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Store the returned URL in the `content` field. Backend treats
      // photo_url contributions as image URLs, so any URL works.
      const API_URL = process.env.REACT_APP_BACKEND_URL || "";
      setContent(API_URL + data.url);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!poiId) { setError(t(lang, "contribute.pickPoi")); return; }
    setBusy(true);
    try {
      await api.post("/contributions", {
        poi_id: poiId, type,
        content: content.trim(), title: title.trim() || null,
      });
      setSuccess(true); setContent(""); setTitle("");
      onSubmitted?.();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const placeholder = (() => {
    if (type === "photo_url") return t(lang, "contribute.types.photo_url_placeholder");
    if (type === "dialogue_prompt") return t(lang, "contribute.types.dialogue_prompt_placeholder");
    return t(lang, "contribute.types.generic_placeholder");
  })();

  return (
    <form onSubmit={submit}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
      data-testid="contribution-form"
    >
      <div>
        <label className="eyebrow block mb-2">{t(lang, "contribute.pickPoi")}</label>
        <select value={poiId} onChange={(e) => setPoiId(e.target.value)}
          className="input-field" required data-testid="contribution-poi-select">
          <option value="">{t(lang, "contribute.pickPoiPlaceholder")}</option>
          {pois.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label className="eyebrow block mb-2">{t(lang, "contribute.typeLabel")}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPE_KEYS.map((tk) => {
            const Icon = tk.icon;
            const active = type === tk.key;
            return (
              <button type="button" key={tk.key} onClick={() => setType(tk.key)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs transition-colors ${
                  active
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]"
                }`}
                data-testid={`contribution-type-${tk.key}`}
              >
                <Icon size={16} strokeWidth={1.6} />
                <span>{t(lang, `contribute.types.${tk.key}`)}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">
          {t(lang, `contribute.types.${type}_hint`)}
        </p>
      </div>

      <div>
        <label className="eyebrow block mb-2">{t(lang, "contribute.titleLabel")}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="input-field" maxLength={120}
          placeholder={t(lang, "contribute.titlePlaceholder")}
          data-testid="contribution-title" />
      </div>

      <div>
        <label className="eyebrow block mb-2">
          {type === "photo_url" ? t(lang, "contribute.photoUrlLabel") : t(lang, "contribute.contentLabel")}
        </label>

        {type === "photo_url" && (
          <div className="mb-2">
            <label className="btn-ghost inline-flex items-center gap-2 text-sm cursor-pointer" data-testid="contribution-upload-label">
              <Image size={14} />
              {uploading ? "Uploading…" : "Upload photo (JPEG/PNG/WebP ≤5 MB)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                data-testid="contribution-upload-input"
              />
            </label>
            {content && (
              <div className="mt-2">
                <img
                  src={content}
                  alt="Preview"
                  className="max-h-40 rounded-lg border border-[var(--border)]"
                  data-testid="contribution-upload-preview"
                />
              </div>
            )}
          </div>
        )}

        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          className="input-field min-h-[120px]" required minLength={2} maxLength={4000}
          placeholder={placeholder} data-testid="contribution-content" />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{content.length}/4000</p>
      </div>

      {error && <p className="text-sm text-[var(--terracotta)]" data-testid="contribution-error">{error}</p>}
      {success && (
        <p className="text-sm text-[var(--deep-green)]" data-testid="contribution-success">
          {t(lang, "contribute.success")}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="contribution-submit">
        {busy ? t(lang, "contribute.submitting") : t(lang, "contribute.submit")}
      </button>
    </form>
  );
}

function ContributionRow({ c, onDelete }) {
  const { lang } = useLocale();
  return (
    <li className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]" data-testid={`my-contribution-${c.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            {t(lang, `contribute.types.${c.type}`)} · {c.poi?.name || "—"}
          </p>
          {c.title && <p className="font-serif text-lg mt-1">{c.title}</p>}
          <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{c.content}</p>
          {c.moderation_note && (
            <p className="text-xs italic mt-2 text-[var(--text-tertiary)]">
              {t(lang, "moderation.adminNote", { note: c.moderation_note })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={c.status} />
          {c.status === "pending" && (
            <button onClick={() => onDelete(c.id)}
              className="text-xs text-[var(--text-tertiary)] inline-flex items-center gap-1 hover:text-[var(--terracotta)]"
              data-testid={`my-contribution-delete-${c.id}`}
            >
              <Trash2 size={12} /> {t(lang, "contribute.withdraw")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ContributePage() {
  const { user } = useAuth();
  const { lang } = useLocale();
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
        <p className="eyebrow">{t(lang, "contribute.gateRestricted")}</p>
        <h1 className="font-serif text-4xl mt-2">{t(lang, "contribute.gateTitle")}</h1>
        <p className="mt-3 text-[var(--text-secondary)]">{t(lang, "contribute.gateText")}</p>
        <Link to="/register?role=contributor" className="btn-primary inline-block mt-6" data-testid="become-contributor-cta">
          {t(lang, "auth.becomeContrib")}
        </Link>
      </div>
    );
  }

  const onDelete = async (id) => {
    if (!window.confirm(t(lang, "contribute.withdrawConfirm"))) return;
    try {
      await api.delete(`/contributions/${id}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      window.alert(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  const liveCount = mine.filter((c) => c.status === "approved").length;

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto" data-testid="contribute-page">
      <p className="eyebrow">{t(lang, "contribute.eyebrow")}</p>
      <h1 className="font-serif text-5xl mt-2 leading-none">{t(lang, "contribute.title")}</h1>
      <p className="mt-3 text-[var(--text-secondary)] max-w-lg">{t(lang, "contribute.lead")}</p>

      <section className="mt-8">
        <ContributionForm pois={pois} onSubmitted={() => setReloadKey((k) => k + 1)} />
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">{t(lang, "contribute.yourContribs")}</h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {t(lang, "contribute.total", { n: mine.length, live: liveCount })}
        </p>
        {mine.length === 0 ? (
          <p className="mt-4 text-[var(--text-secondary)]">{t(lang, "contribute.empty")}</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {mine.map((c) => <ContributionRow key={c.id} c={c} onDelete={onDelete} />)}
          </ul>
        )}
      </section>

      {user.role === "admin" && (
        <div className="mt-10 text-center">
          <Link to="/admin/contributions" className="text-[var(--terracotta)] underline" data-testid="contribute-go-moderation">
            {t(lang, "contribute.moderationOpen")}
          </Link>
        </div>
      )}
    </div>
  );
}

export { ContributionRow, StatusBadge };
