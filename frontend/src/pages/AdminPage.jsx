import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, RotateCcw, Sparkles } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { devWarn } from "../lib/log";
import { useAuth } from "../lib/auth";
import POIRow from "../components/admin/POIRow";
import POIForm from "../components/admin/POIForm";
import { useArea, pickLocale, getAreaCenter } from "../lib/area";
import useLocale from "../hooks/useLocale";

const AREA_FALLBACK_CENTER = getAreaCenter();
const EMPTY_POI = {
  name: "", short_description: "", long_description: "",
  latitude: AREA_FALLBACK_CENTER.latitude, longitude: AREA_FALLBACK_CENTER.longitude,
  address: "", category: "Hidden Gem",
  image_url: "https://images.unsplash.com/photo-1512204925985-f52390a87fda?w=1200",
  trigger_radius_m: 60, hours: "", fun_fact: "",
  interest_tags: [],
  opening_line: { en: "" },
  canonical_facts: [],
};

function NotAdmin() {
  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-md mx-auto text-center">
      <p className="eyebrow">Restricted</p>
      <h1 className="font-serif text-4xl mt-2">Admins only</h1>
      <p className="mt-3 text-[var(--text-secondary)]">
        You need an admin account to curate POIs.
      </p>
      <Link to="/login" className="btn-primary inline-block mt-6">Sign in</Link>
    </div>
  );
}

function ResetConfirm({ busy, onConfirm, onCancel }) {
  return (
    <div className="mt-6 p-5 rounded-2xl border border-[var(--terracotta)] bg-[var(--surface)]">
      <p className="font-medium">Empty the POI database?</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">
        This deletes all current POIs so a student can add fresh ones. Default POIs can be re-seeded later.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onConfirm}
          className="btn-primary"
          disabled={busy}
          data-testid="admin-reset-confirm"
        >
          {busy ? "Resetting…" : "Yes, empty it"}
        </button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user && user !== false && user.role === "admin";
  const area = useArea();
  const { lang: uiLang } = useLocale();
  const areaLabel = pickLocale(area.area, uiLang) || "the area";

  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | <id>
  const [form, setForm] = useState(EMPTY_POI);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const reload = useCallback(
    () => api.get("/pois").then(({ data }) => setPois(data)),
    []
  );

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    reload().finally(() => setLoading(false));
  }, [isAdmin, reload]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">Loading…</p>;
  if (!isAdmin) return <NotAdmin />;

  const startCreate = () => { setEditing("new"); setForm(EMPTY_POI); setError(null); };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...EMPTY_POI, ...p }); setError(null); };
  const cancel = () => { setEditing(null); setError(null); };

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = {
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      trigger_radius_m: parseInt(form.trigger_radius_m, 10) || 60,
      interest_tags: Array.isArray(form.interest_tags) ? form.interest_tags : [],
      opening_line: form.opening_line || {},
      canonical_facts: Array.isArray(form.canonical_facts) ? form.canonical_facts : [],
    };
    try {
      if (editing === "new") await api.post("/pois", payload);
      else await api.put(`/pois/${editing}`, payload);
      await reload();
      setEditing(null);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this POI?")) return;
    try {
      await api.delete(`/pois/${id}`);
      await reload();
    } catch (err) {
      devWarn("Delete failed:", err);
    }
  };

  const resetAll = async () => {
    setBusy(true);
    try {
      await api.post("/pois/reset");
      await reload();
      setConfirmReset(false);
    } catch (err) {
      devWarn("Reset failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const reseed = async () => {
    setBusy(true);
    try {
      await api.post("/pois/seed");
      await reload();
    } catch (err) {
      devWarn("Re-seed failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-10 pb-32 max-w-4xl mx-auto" data-testid="admin-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="font-serif text-5xl mt-2 leading-none">Curate {areaLabel}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/admin/area"
            className="btn-ghost inline-flex items-center gap-2"
            data-testid="admin-area-link"
          >
            <Sparkles size={16} /> Area settings
          </Link>
          <button
            onClick={startCreate}
            className="btn-primary inline-flex items-center gap-2"
            data-testid="admin-add-btn"
          >
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
        <ResetConfirm
          busy={busy}
          onConfirm={resetAll}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {editing && (
        <POIForm
          form={form}
          setForm={setForm}
          isNew={editing === "new"}
          busy={busy}
          error={error}
          onSubmit={save}
          onCancel={cancel}
        />
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
            <POIRow key={p.id} poi={p} onEdit={startEdit} onDelete={remove} />
          ))}
        </ul>
      </div>
    </div>
  );
}
