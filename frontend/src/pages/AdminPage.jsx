import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Plus, RotateCcw, Sparkles } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

const EMPTY_POI = {
  name: "", short_description: "", long_description: "",
  latitude: 45.4719, longitude: 9.1881,
  address: "", category: "Hidden Gem",
  image_url: "https://images.unsplash.com/photo-1512204925985-f52390a87fda?w=1200",
  trigger_radius_m: 60, hours: "", fun_fact: "",
};

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user && user !== false && user.role === "admin";

  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_POI);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const reload = () => api.get("/pois").then(({ data }) => setPois(data));

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    reload().finally(() => setLoading(false));
  }, [isAdmin]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">Loading…</p>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen px-5 pt-12 pb-32 max-w-md mx-auto text-center">
        <p className="eyebrow">Restricted</p>
        <h1 className="font-serif text-4xl mt-2">Admins only</h1>
        <p className="mt-3 text-[var(--text-secondary)]">You need an admin account to curate POIs.</p>
        <Link to="/login" className="btn-primary inline-block mt-6">Sign in</Link>
      </div>
    );
  }

  const startCreate = () => { setEditing("new"); setForm(EMPTY_POI); setError(null); };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...EMPTY_POI, ...p }); setError(null); };
  const cancel = () => { setEditing(null); setError(null); };

  const save = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    const payload = {
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      trigger_radius_m: parseInt(form.trigger_radius_m, 10) || 60,
    };
    try {
      if (editing === "new") await api.post("/pois", payload);
      else await api.put(`/pois/${editing}`, payload);
      await reload();
      setEditing(null);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this POI?")) return;
    await api.delete(`/pois/${id}`);
    reload();
  };

  const resetAll = async () => {
    setBusy(true);
    try { await api.post("/pois/reset"); await reload(); setConfirmReset(false); }
    finally { setBusy(false); }
  };

  const reseed = async () => {
    setBusy(true);
    try { await api.post("/pois/seed"); await reload(); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen px-5 pt-10 pb-32 max-w-4xl mx-auto" data-testid="admin-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">Curate Brera</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={startCreate} className="btn-primary inline-flex items-center gap-2" data-testid="admin-add-btn">
            <Plus size={16} /> Add POI
          </button>
          <button
            onClick={reseed}
            className="btn-ghost inline-flex items-center gap-2"
            disabled={busy}
            data-testid="admin-reseed-btn"
            title="Adds default POIs only if the list is currently empty"
          >
            <Sparkles size={16} /> Re-seed defaults
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            className="btn-ghost inline-flex items-center gap-2"
            data-testid="admin-reset-btn"
          >
            <RotateCcw size={16} /> Reset (empty)
          </button>
        </div>
      </div>

      {confirmReset && (
        <div className="mt-6 p-5 rounded-2xl border border-[var(--terracotta)] bg-[var(--surface)]">
          <p className="font-medium">Empty the POI database?</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            This deletes all current POIs so a student can add fresh ones. Default POIs can be re-seeded later.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={resetAll} className="btn-primary" disabled={busy} data-testid="admin-reset-confirm">
              {busy ? "Resetting…" : "Yes, empty it"}
            </button>
            <button onClick={() => setConfirmReset(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 grid gap-3 sm:grid-cols-2" data-testid="admin-form">
          <div className="sm:col-span-2">
            <label className="eyebrow block mb-1">Name</label>
            <input className="input-field" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="admin-form-name" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Category</label>
            <input className="input-field" required value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="eyebrow block mb-1">Address</label>
            <input className="input-field" required value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="eyebrow block mb-1">Latitude</label>
            <input className="input-field" required type="number" step="any" value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          </div>
          <div>
            <label className="eyebrow block mb-1">Longitude</label>
            <input className="input-field" required type="number" step="any" value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          </div>
          <div>
            <label className="eyebrow block mb-1">Trigger radius (m)</label>
            <input className="input-field" type="number" min="10" max="500" value={form.trigger_radius_m}
              onChange={(e) => setForm({ ...form, trigger_radius_m: e.target.value })} />
          </div>
          <div>
            <label className="eyebrow block mb-1">Hours</label>
            <input className="input-field" value={form.hours || ""}
              onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="eyebrow block mb-1">Image URL</label>
            <input className="input-field" required value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="eyebrow block mb-1">Short description</label>
            <input className="input-field" required value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="eyebrow block mb-1">Long description</label>
            <textarea className="input-field" rows={4} required value={form.long_description}
              onChange={(e) => setForm({ ...form, long_description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="eyebrow block mb-1">Fun fact (optional)</label>
            <input className="input-field" value={form.fun_fact || ""}
              onChange={(e) => setForm({ ...form, fun_fact: e.target.value })} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-[var(--terracotta)]">{error}</p>}
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={cancel} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy} data-testid="admin-form-save">
              {busy ? "Saving…" : editing === "new" ? "Create POI" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-8">
        {loading && <p className="text-[var(--text-tertiary)]">Loading…</p>}
        {!loading && pois.length === 0 && (
          <p className="text-[var(--text-secondary)]">
            No POIs yet — click "Add POI" or "Re-seed defaults".
          </p>
        )}
        <ul className="space-y-2">
          {pois.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3"
              data-testid={`admin-row-${p.id}`}
            >
              <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <div className="flex-1 min-w-0">
                <p className="eyebrow truncate">{p.category}</p>
                <p className="font-serif text-lg leading-tight truncate">{p.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} · {p.trigger_radius_m}m
                </p>
              </div>
              <button onClick={() => startEdit(p)} className="p-2 rounded-full hover:bg-[var(--bg)]" data-testid={`admin-edit-${p.id}`}>
                <Pencil size={16} strokeWidth={1.5} />
              </button>
              <button onClick={() => remove(p.id)} className="p-2 rounded-full hover:bg-[var(--bg)] text-[var(--terracotta)]" data-testid={`admin-delete-${p.id}`}>
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
