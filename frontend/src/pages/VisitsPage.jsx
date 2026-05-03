import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useArea, pickLocale } from "../lib/area";
import useLocale from "../hooks/useLocale";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function VisitsPage() {
  const { user } = useAuth();
  const isAuthed = !!user && user !== false;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const area = useArea();
  const { lang: uiLang } = useLocale();
  const areaLabel = pickLocale(area.area, uiLang) || "the area";

  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    api.get("/me/visits").then(({ data }) => setItems(data)).finally(() => setLoading(false));
  }, [isAuthed]);

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto" data-testid="visits-page">
      <p className="eyebrow">Your wanderings</p>
      <h1 className="font-serif text-5xl mt-2 leading-none">Visits</h1>
      <p className="mt-3 text-[var(--text-secondary)]">
        {areaLabel} spots you've physically reached.
      </p>

      {!isAuthed && (
        <div className="mt-10 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
          <p className="text-[var(--text-secondary)]">Sign in to keep a journal of the places you actually walk into.</p>
          <Link to="/login" className="btn-primary inline-block mt-5" data-testid="visits-go-login">
            Sign in
          </Link>
        </div>
      )}

      {isAuthed && loading && <p className="mt-10 text-[var(--text-tertiary)]">Loading…</p>}

      {isAuthed && !loading && items.length === 0 && (
        <div className="mt-10 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
          <History size={28} strokeWidth={1.4} className="mx-auto text-[var(--terracotta)]" />
          <p className="mt-3 text-[var(--text-secondary)]">
            No visits yet — when you step inside a POI's circle, the device will buzz and the visit is logged here.
          </p>
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {items.map((v) => v.poi && (
          <li
            key={v.id}
            className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3"
            data-testid={`visit-row-${v.id}`}
          >
            <img src={v.poi.image_url} alt={v.poi.name} className="w-16 h-16 rounded-xl object-cover"
                 onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="flex-1">
              <p className="eyebrow">{v.poi.category}</p>
              <p className="font-serif text-lg leading-tight">{v.poi.name}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{formatDate(v.visited_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
