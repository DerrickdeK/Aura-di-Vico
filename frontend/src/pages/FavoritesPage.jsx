import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function FavoritesPage() {
  const { user } = useAuth();
  const isAuthed = !!user && user !== false;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    api.get("/me/favorites")
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, [isAuthed]);

  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-2xl mx-auto" data-testid="favorites-page">
      <p className="eyebrow">Your collection</p>
      <h1 className="font-serif text-5xl mt-2 leading-none">Favorites</h1>
      <p className="mt-3 text-[var(--text-secondary)]">
        Places you've saved to revisit.
      </p>

      {!isAuthed && (
        <div className="mt-10 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
          <p className="text-[var(--text-secondary)]">Sign in to save the spots that capture your eye.</p>
          <Link to="/login" className="btn-primary inline-block mt-5" data-testid="favorites-go-login">
            Sign in
          </Link>
        </div>
      )}

      {isAuthed && loading && <p className="mt-10 text-[var(--text-tertiary)]">Loading…</p>}

      {isAuthed && !loading && items.length === 0 && (
        <div className="mt-10 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8">
          <Heart size={28} strokeWidth={1.4} className="mx-auto text-[var(--terracotta)]" />
          <p className="mt-3 text-[var(--text-secondary)]">No favorites yet — explore the map and tap the heart on a place that calls you.</p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((p) => (
          <article
            key={p.id}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
            data-testid={`favorite-card-${p.id}`}
          >
            <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover"
                 onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="p-4">
              <p className="eyebrow">{p.category}</p>
              <h3 className="font-serif text-2xl mt-1 leading-tight">{p.name}</h3>
              <p className="text-sm mt-2 text-[var(--text-secondary)] line-clamp-3">{p.short_description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
