import React, { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { Check, X as XIcon, Trash2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import { StatusBadge } from "./ContributePage";

const TAB_KEYS = ["pending", "auto_blocked", "approved", "rejected"];

function ModerationCard({ c, onApprove, onReject, onDelete }) {
  const { lang } = useLocale();
  const [note, setNote] = useState("");
  return (
    <li
      className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]"
      data-testid={`moderation-card-${c.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
            {t(lang, `contribute.types.${c.type}`)} · {c.poi?.name || "—"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {t(lang, "moderation.authorLine", {
              name: c.user_name || "anonymous",
              date: new Date(c.created_at).toLocaleString(),
            })}
          </p>
          {c.title && <p className="font-serif text-lg mt-2">{c.title}</p>}
          <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{c.content}</p>
          {c.moderation_note && (
            <p className="text-xs italic mt-2 text-[var(--text-tertiary)]">
              {t(lang, "moderation.previousNote", { note: c.moderation_note })}
            </p>
          )}
        </div>
        <StatusBadge status={c.status} />
      </div>

      {c.status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(lang, "moderation.notePlaceholder")}
            className="input-field text-sm flex-1 min-w-[200px]"
            data-testid={`moderation-note-${c.id}`}
          />
          <button
            onClick={() => onApprove(c.id, note)}
            className="btn-primary inline-flex items-center gap-1 text-sm"
            data-testid={`moderation-approve-${c.id}`}
          >
            <Check size={14} /> {t(lang, "moderation.approve")}
          </button>
          <button
            onClick={() => onReject(c.id, note)}
            className="btn-ghost inline-flex items-center gap-1 text-sm"
            data-testid={`moderation-reject-${c.id}`}
          >
            <XIcon size={14} /> {t(lang, "moderation.reject")}
          </button>
        </div>
      )}

      <div className="mt-3 text-right">
        <button
          onClick={() => onDelete(c.id)}
          className="text-xs text-[var(--text-tertiary)] inline-flex items-center gap-1 hover:text-[var(--terracotta)]"
          data-testid={`moderation-delete-${c.id}`}
        >
          <Trash2 size={12} /> {t(lang, "moderation.delete")}
        </button>
      </div>
    </li>
  );
}

export default function AdminContributionsPage() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const isAdmin = user && user !== false && user.role === "admin";
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return api.get(`/contributions?status=${tab}`)
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    reload();
  }, [isAdmin, reload]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen px-5 pt-12 pb-32 max-w-md mx-auto text-center">
        <p className="eyebrow">{t(lang, "contribute.gateRestricted")}</p>
        <h1 className="font-serif text-4xl mt-2">Admins only</h1>
        <Link to="/" className="btn-primary inline-block mt-6">Home</Link>
      </div>
    );
  }

  const moderate = async (id, status, note) => {
    try {
      await api.patch(`/contributions/${id}/moderate`, { status, note: note || null });
      reload();
    } catch (err) {
      window.alert(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t(lang, "moderation.deleteConfirm"))) return;
    try {
      await api.delete(`/contributions/${id}`);
      reload();
    } catch (err) {
      window.alert(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-10 pb-32 max-w-3xl mx-auto" data-testid="admin-contributions-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">{t(lang, "moderation.eyebrow")}</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">{t(lang, "moderation.title")}</h1>
        </div>
        <Link to="/admin" className="btn-ghost text-sm">{t(lang, "moderation.backToPoi")}</Link>
      </div>

      <div className="mt-6 flex gap-2 border-b border-[var(--border)] flex-wrap">
        {TAB_KEYS.map((key) => {
          // Map underscore_case to camelCase for the i18n key
          const labelKey = "moderation.tab" + key.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm transition-colors ${
                tab === key
                  ? "text-[var(--terracotta)] border-b-2 border-[var(--terracotta)] -mb-px"
                  : "text-[var(--text-secondary)]"
              }`}
              data-testid={`moderation-tab-${key}`}
            >
              {t(lang, labelKey)}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {loading && <p className="text-[var(--text-tertiary)]">…</p>}
        {!loading && items.length === 0 && (
          <p className="text-[var(--text-secondary)]" data-testid="moderation-empty">
            {t(lang, "moderation.empty")}
          </p>
        )}
        <ul className="space-y-3">
          {items.map((c) => (
            <ModerationCard
              key={c.id}
              c={c}
              onApprove={(id, note) => moderate(id, "approved", note)}
              onReject={(id, note) => moderate(id, "rejected", note)}
              onDelete={remove}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
