import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t, getOpeningLine } from "../lib/i18n";

const ZONE_COLOR = { sensed: "var(--deep-green)", called: "var(--warm-ochre)", found: "var(--terracotta)" };
const ZONE_BG = { sensed: "#1E3A2F", called: "#C98A3C", found: "#BD5745" };

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function DiscoveriesPage() {
  const { user } = useAuth();
  const isAuthed = !!user && user !== false;
  const language = user?.language || "en";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    api.get("/me/discoveries").then(({ data }) => setItems(data)).finally(() => setLoading(false));
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto text-center">
        <p className="eyebrow">Restricted</p>
        <h1 className="font-serif text-4xl mt-2">Sign in to keep your whispers</h1>
        <Link to="/login" className="btn-primary inline-block mt-6">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto" data-testid="discoveries-page">
      <p className="eyebrow">Your wanderings</p>
      <h1 className="font-serif text-5xl mt-2 leading-none">
        {t(language, "discoveriesTitle")}
      </h1>

      {loading && <p className="mt-10 text-[var(--text-tertiary)]">…</p>}

      {!loading && items.length === 0 && (
        <div className="mt-10 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
          <Sparkles size={28} strokeWidth={1.4} className="mx-auto text-[var(--terracotta)]" />
          <p className="mt-3 text-[var(--text-secondary)]">{t(language, "discoveriesEmpty")}</p>
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {items.map((d) => (
          <li
            key={d.id}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
            data-testid={`discovery-${d.id}`}
          >
            <div className="flex items-center gap-4 p-3">
              {d.poi?.image_url && (
                <img
                  src={d.poi.image_url}
                  alt={d.poi.name}
                  className="w-16 h-16 rounded-xl object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] tracking-widest uppercase text-[var(--inverse)] px-2 py-0.5 rounded-full"
                    style={{ background: ZONE_BG[d.zone] }}
                  >
                    {t(language, `zones.${d.zone}`)}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatDate(d.discovered_at)}
                  </span>
                </div>
                <p className="font-serif text-lg leading-tight mt-1">{d.poi?.name}</p>
                <p
                  className="text-sm mt-0.5 italic line-clamp-2"
                  style={{ color: ZONE_COLOR[d.zone] }}
                >
                  {getOpeningLine(d.poi, language) || d.poi?.short_description}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
