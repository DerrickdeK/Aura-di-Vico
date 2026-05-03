import React, { useEffect, useState } from "react";
import { Gift, TrendingUp } from "lucide-react";
import { api } from "../../lib/api";

/** Lightweight inline SVG sparkline — no recharts dependency. */
function Sparkline({ data, width = 180, height = 36 }) {
  if (!data?.length) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = width / Math.max(1, data.length - 1);
  const pts = data.map((d, i) =>
    `${(i * step).toFixed(1)},${(height - (d.count / max) * (height - 4) - 2).toFixed(1)}`
  ).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden>
      <polyline
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

export default function GiftStatsCard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/admin/gift-stats")
      .then(({ data }) => { if (!cancelled) setStats(data); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Load failed"); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-5 bg-[var(--surface)]">
        <p className="text-sm text-[var(--text-tertiary)]">Gift stats unavailable.</p>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-5 bg-[var(--surface)]">
        <p className="text-sm text-[var(--text-tertiary)]">Loading gift stats…</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-5 bg-[var(--surface)] space-y-4"
      data-testid="admin-gift-stats"
    >
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-[var(--terracotta)]" />
        <h3 className="font-serif text-lg">Gift itineraries</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="eyebrow">Total</p>
          <p className="font-serif text-3xl mt-1" data-testid="gift-stats-total">
            {stats.total_gifts}
          </p>
        </div>
        <div>
          <p className="eyebrow">Views</p>
          <p className="font-serif text-3xl mt-1" data-testid="gift-stats-views">
            {stats.total_views}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="eyebrow flex items-center gap-1">
            <TrendingUp size={12} /> Last 30 days
          </p>
          <div className="mt-1" data-testid="gift-stats-sparkline">
            <Sparkline data={stats.last_30_days} />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {stats.last_30_days.reduce((sum, d) => sum + d.count, 0)} in the window
          </p>
        </div>
      </div>

      {stats.top_senders?.length > 0 && (
        <div className="pt-3 border-t border-[var(--border)]">
          <p className="eyebrow">Top senders</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm" data-testid="gift-stats-top-senders">
            {stats.top_senders.map((s) => (
              <li
                key={s.sender_name}
                className="px-2 py-1 rounded-full bg-[var(--bg)] border border-[var(--border)]"
              >
                <span className="font-medium">{s.sender_name}</span>
                <span className="text-[var(--text-tertiary)] text-xs ml-1">· {s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
