import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Save, RotateCcw, Download, Upload, Plus, Trash2, MapPin, Wand2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useArea } from "../lib/area";

const TABS = [
  { id: "brand",     label: "Brand & Palette" },
  { id: "map",       label: "Map & Center" },
  { id: "landmarks", label: "Landmarks" },
  { id: "io",        label: "Import / Export" },
];

const PALETTE_KEYS = [
  ["bg", "Background"],
  ["surface", "Surface"],
  ["map-water", "Map water"],
  ["text-primary", "Text primary"],
  ["text-secondary", "Text secondary"],
  ["text-tertiary", "Text tertiary"],
  ["inverse", "Inverse (on-dark)"],
  ["terracotta", "Terracotta (accent)"],
  ["deep-green", "Deep green"],
  ["warm-ochre", "Warm ochre"],
  ["border", "Border"],
];

function LocalisedRow({ label, value, onChange, placeholder }) {
  const v = value || {};
  return (
    <div className="grid sm:grid-cols-[160px_1fr_1fr] gap-3 items-start">
      <label className="text-sm text-[var(--text-secondary)] pt-2">{label}</label>
      <input
        type="text"
        value={v.it || ""}
        placeholder={(placeholder && placeholder.it) || "Italiano"}
        onChange={(e) => onChange({ ...v, it: e.target.value })}
        className="input-field text-sm"
        data-testid={`area-${label.toLowerCase()}-it`}
      />
      <input
        type="text"
        value={v.en || ""}
        placeholder={(placeholder && placeholder.en) || "English"}
        onChange={(e) => onChange({ ...v, en: e.target.value })}
        className="input-field text-sm"
        data-testid={`area-${label.toLowerCase()}-en`}
      />
    </div>
  );
}

function BrandTab({ draft, setDraft }) {
  const setField = (k) => (val) => setDraft((d) => ({ ...d, [k]: val }));
  const palette = draft.palette || {};
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-serif text-xl">Identity</h3>
        <div className="grid sm:grid-cols-[160px_1fr_1fr] gap-3">
          <div />
          <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">Italian</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">English</div>
        </div>
        <LocalisedRow label="Brand"  value={draft.brand}   onChange={setField("brand")}   placeholder={{it:"Aura di Trastevere", en:"Aura di Trastevere"}} />
        <LocalisedRow label="Area"   value={draft.area}    onChange={setField("area")}    placeholder={{it:"Trastevere", en:"Trastevere"}} />
        <LocalisedRow label="City"   value={draft.city}    onChange={setField("city")}    placeholder={{it:"Roma", en:"Rome"}} />
        <LocalisedRow label="Tagline"value={draft.tagline} onChange={setField("tagline")} placeholder={{it:"il quartiere artigiano", en:"the artisan quarter"}} />
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl">Palette</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Pick any colour — changes apply live as CSS variables. The accent (terracotta) is used on every primary button and link.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PALETTE_KEYS.map(([key, label]) => {
            const current = palette[key] || "";
            return (
              <div key={key} className="flex items-center gap-3">
                <label className="flex-1 text-sm">{label} <span className="text-[var(--text-tertiary)] text-xs">({key})</span></label>
                <input
                  type="color"
                  value={current || "#000000"}
                  onChange={(e) => setDraft((d) => ({ ...d, palette: { ...(d.palette || {}), [key]: e.target.value } }))}
                  className="w-10 h-10 rounded border border-[var(--border)] cursor-pointer"
                  data-testid={`area-palette-${key}`}
                />
                <input
                  type="text"
                  value={current}
                  onChange={(e) => setDraft((d) => ({ ...d, palette: { ...(d.palette || {}), [key]: e.target.value } }))}
                  className="input-field text-xs font-mono w-28"
                  placeholder="#RRGGBB"
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ClickToSetCenter({ onPick }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

function FlyToCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center.lat === "number") {
      map.setView([center.lat, center.lng], map.getZoom() || 14);
    }
  }, [center?.lat, center?.lng, map]);
  return null;
}

// Pin icon re-uses the core CSS class already in index.css.
const pinIcon = L.divIcon({
  className: "brera-marker",
  html: '<div class="brera-marker-pin brera-marker-visited"><span>★</span></div>',
  iconSize: [38, 38], iconAnchor: [19, 19],
});

function MapTab({ draft, setDraft }) {
  const mapCfg = draft.map || {};
  const center = mapCfg.center || { lat: 45.472, lng: 9.188 };
  const setCenter = (c) => setDraft((d) => ({ ...d, map: { ...(d.map || {}), center: c } }));
  const setZoom = (key, val) => setDraft((d) => ({ ...d, map: { ...(d.map || {}), [key]: val } }));
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Click anywhere on the map to set the default centre (used when GPS is unavailable).
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Latitude
          <input
            type="number" step="0.0001"
            value={center.lat ?? ""}
            onChange={(e) => setCenter({ ...center, lat: parseFloat(e.target.value) || 0 })}
            className="input-field mt-1 w-full font-mono text-sm"
            data-testid="area-map-lat"
          />
        </label>
        <label className="text-sm">
          Longitude
          <input
            type="number" step="0.0001"
            value={center.lng ?? ""}
            onChange={(e) => setCenter({ ...center, lng: parseFloat(e.target.value) || 0 })}
            className="input-field mt-1 w-full font-mono text-sm"
            data-testid="area-map-lng"
          />
        </label>
        <label className="text-sm">
          Default zoom <span className="text-[var(--text-tertiary)] text-xs">(live map)</span>
          <input
            type="number" min="10" max="19"
            value={mapCfg.default_zoom ?? 15}
            onChange={(e) => setZoom("default_zoom", parseInt(e.target.value, 10) || 15)}
            className="input-field mt-1 w-full font-mono text-sm"
            data-testid="area-map-zoom"
          />
        </label>
        <label className="text-sm">
          Landing zoom <span className="text-[var(--text-tertiary)] text-xs">(home map)</span>
          <input
            type="number" min="10" max="19"
            value={mapCfg.landing_zoom ?? 14}
            onChange={(e) => setZoom("landing_zoom", parseInt(e.target.value, 10) || 14)}
            className="input-field mt-1 w-full font-mono text-sm"
            data-testid="area-map-landing-zoom"
          />
        </label>
      </div>
      <div className="rounded-2xl overflow-hidden border border-[var(--border)]" style={{ height: 360 }}>
        <MapContainer
          key={`${center.lat}-${center.lng}`}
          center={[center.lat, center.lng]}
          zoom={mapCfg.landing_zoom || 14}
          scrollWheelZoom
          className="w-full h-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <Marker position={[center.lat, center.lng]} icon={pinIcon} />
          <ClickToSetCenter onPick={setCenter} />
          <FlyToCenter center={center} />
        </MapContainer>
      </div>
    </div>
  );
}

function LandmarkCard({ lm, onChange, onDelete }) {
  const set = (path, value) => {
    onChange((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...(cur[keys[i]] || {}) };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };
  return (
    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--surface)] space-y-3" data-testid={`area-landmark-card-${lm.id}`}>
      <div className="flex items-start gap-2">
        <MapPin size={16} className="text-[var(--terracotta)] mt-1" />
        <input
          type="text"
          value={lm.id || ""}
          onChange={(e) => set("id", e.target.value.replace(/[^a-z0-9-]/g, ""))}
          placeholder="slug-id"
          className="input-field text-sm font-mono flex-1"
        />
        <button
          onClick={onDelete}
          className="text-[var(--terracotta)] hover:opacity-70"
          aria-label="Delete"
          data-testid={`area-landmark-delete-${lm.id}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <input className="input-field text-sm" placeholder="Name (IT)"  value={lm.name?.it || ""} onChange={(e) => set("name.it", e.target.value)} />
        <input className="input-field text-sm" placeholder="Name (EN)"  value={lm.name?.en || ""} onChange={(e) => set("name.en", e.target.value)} />
        <input className="input-field text-sm" placeholder="Note (IT)"  value={lm.note?.it || ""} onChange={(e) => set("note.it", e.target.value)} />
        <input className="input-field text-sm" placeholder="Note (EN)"  value={lm.note?.en || ""} onChange={(e) => set("note.en", e.target.value)} />
        <input className="input-field text-sm" placeholder="Voice (IT) — one-line whisper"  value={lm.voice?.it || ""} onChange={(e) => set("voice.it", e.target.value)} />
        <input className="input-field text-sm" placeholder="Voice (EN)" value={lm.voice?.en || ""} onChange={(e) => set("voice.en", e.target.value)} />
        <input className="input-field text-sm font-mono" placeholder="Latitude"  type="number" step="0.0001" value={lm.latitude ?? ""}  onChange={(e) => set("latitude", parseFloat(e.target.value) || 0)} />
        <input className="input-field text-sm font-mono" placeholder="Longitude" type="number" step="0.0001" value={lm.longitude ?? ""} onChange={(e) => set("longitude", parseFloat(e.target.value) || 0)} />
      </div>
      <textarea className="input-field text-sm w-full" rows={2} placeholder="Intro (IT) — narrator paragraph"  value={lm.intro?.it || ""} onChange={(e) => set("intro.it", e.target.value)} />
      <textarea className="input-field text-sm w-full" rows={2} placeholder="Intro (EN)" value={lm.intro?.en || ""} onChange={(e) => set("intro.en", e.target.value)} />
      <input className="input-field text-sm w-full" placeholder="Image URL or Wikimedia path" value={lm.image_wikimedia || lm.image_url || ""} onChange={(e) => set("image_wikimedia", e.target.value)} />
    </div>
  );
}

function LandmarksTab({ draft, setDraft }) {
  const landmarks = draft.landmarks || [];
  const update = (idx, updater) => {
    setDraft((d) => {
      const lms = [...(d.landmarks || [])];
      lms[idx] = typeof updater === "function" ? updater(lms[idx]) : updater;
      return { ...d, landmarks: lms };
    });
  };
  const remove = (idx) => {
    setDraft((d) => {
      const lms = [...(d.landmarks || [])];
      lms.splice(idx, 1);
      return { ...d, landmarks: lms };
    });
  };
  const add = () => {
    setDraft((d) => ({
      ...d,
      landmarks: [...(d.landmarks || []), {
        id: `landmark-${(d.landmarks || []).length + 1}`,
        name: { it: "", en: "" }, note: { it: "", en: "" },
        intro: { it: "", en: "" }, voice: { it: "", en: "" },
        latitude: 0, longitude: 0, image_wikimedia: "",
        canonical_facts: [],
      }],
    }));
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {landmarks.length}/8 landmarks. Minimum 3 recommended for a rich landing page.
        </p>
        <button
          onClick={add}
          disabled={landmarks.length >= 8}
          className="btn-ghost inline-flex items-center gap-1 text-sm"
          data-testid="area-landmark-add"
        >
          <Plus size={14} /> Add landmark
        </button>
      </div>
      <div className="space-y-3">
        {landmarks.map((lm, idx) => (
          <LandmarkCard
            key={idx}
            lm={lm}
            onChange={(updater) => update(idx, updater)}
            onDelete={() => remove(idx)}
          />
        ))}
      </div>
    </div>
  );
}

function IOTab({ reload }) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const download = async () => {
    try {
      const resp = await api.get("/admin/area-export", { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `area-config.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportError(formatApiError(err?.response?.data?.detail) || "Export failed");
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportError(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await api.post("/admin/area-import", payload);
      await reload();
    } catch (err) {
      setImportError(err.message || "Invalid JSON");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border)] p-5">
        <h3 className="font-serif text-lg flex items-center gap-2"><Download size={16} /> Export</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Download the current area configuration (brand, palette, map, landmarks AND the POI seed) as a single JSON file. Drop it at <code className="text-xs bg-[var(--bg)] px-1.5 py-0.5 rounded">/app/area.config.json</code> on any deploy to reproduce this city exactly.
        </p>
        <button onClick={download} className="btn-primary inline-flex items-center gap-2 mt-3 text-sm" data-testid="area-export-btn">
          <Download size={14} /> Download area-config.json
        </button>
      </div>
      <div className="rounded-2xl border border-[var(--border)] p-5">
        <h3 className="font-serif text-lg flex items-center gap-2"><Upload size={16} /> Import</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Upload an <code className="text-xs bg-[var(--bg)] px-1.5 py-0.5 rounded">area-config.json</code> to replace the current overrides. POIs from the JSON are not auto-imported — use the POI admin page to re-seed.
        </p>
        <label className="btn-ghost inline-flex items-center gap-2 mt-3 text-sm cursor-pointer">
          <Upload size={14} />
          {importing ? "Importing…" : "Choose JSON file"}
          <input type="file" accept="application/json,.json" onChange={handleFile} className="hidden" data-testid="area-import-input" />
        </label>
        {importError && <p className="mt-2 text-sm text-[var(--terracotta)]">{importError}</p>}
      </div>
    </div>
  );
}

function NotAdmin() {
  return (
    <div className="min-h-screen px-5 pt-12 pb-32 max-w-md mx-auto text-center">
      <p className="eyebrow">Restricted</p>
      <h1 className="font-serif text-4xl mt-2">Admins only</h1>
      <Link to="/login" className="btn-primary inline-block mt-6">Sign in</Link>
    </div>
  );
}

function CloneWizardModal({ onClose, onApply }) {
  const [cityName, setCityName] = useState("");
  const [country, setCountry] = useState("");
  const [vibe, setVibe] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setDraft(null);
    try {
      const { data } = await api.post("/admin/area-clone", {
        city_name: cityName.trim(),
        country: country.trim() || null,
        vibe: vibe.trim() || null,
      });
      setDraft(data.draft);
    } catch (err) {
      const msg = formatApiError(err?.response?.data?.detail) || err.message || "Clone failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `area-${draft.slug || "draft"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="area-clone-modal">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Wand2 size={18} className="text-[var(--terracotta)]" />
          <h2 className="font-serif text-2xl">Clone to new city</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Claude Sonnet 4.5 drafts a starter <code className="text-xs bg-[var(--bg)] px-1 rounded">area.config.json</code> for any neighbourhood — brand, palette, map center, and 4 well-known landmarks. You can edit every field afterwards. POIs are added separately in the main admin.
        </p>

        {!draft && (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              City or neighbourhood <span className="text-[var(--terracotta)]">*</span>
              <input
                type="text"
                required
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="e.g. Trastevere, or Oltrarno, or Belleville"
                className="input-field mt-1 w-full"
                data-testid="clone-input-city"
                autoFocus
              />
            </label>
            <label className="block text-sm">
              Country <span className="text-[var(--text-tertiary)] text-xs">(optional)</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Italy, France, Japan…"
                className="input-field mt-1 w-full"
                data-testid="clone-input-country"
              />
            </label>
            <label className="block text-sm">
              Vibe hint <span className="text-[var(--text-tertiary)] text-xs">(optional)</span>
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="bohemian nightlife · coastal fishermen · mountain monastic…"
                className="input-field mt-1 w-full"
                data-testid="clone-input-vibe"
              />
            </label>
            {error && <p className="text-sm text-[var(--terracotta)]" data-testid="clone-error">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost text-sm flex-1">Cancel</button>
              <button
                type="submit"
                disabled={busy || cityName.trim().length < 2}
                className="btn-primary inline-flex items-center justify-center gap-2 text-sm flex-1"
                data-testid="clone-submit"
              >
                <Wand2 size={14} /> {busy ? "Drafting…" : "Draft with Claude"}
              </button>
            </div>
            {busy && (
              <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                This takes 20–40 seconds. Claude is choosing landmarks and a palette specific to this area.
              </p>
            )}
          </form>
        )}

        {draft && (
          <div className="space-y-3" data-testid="clone-preview">
            <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg)]">
              <p className="eyebrow">Draft ready</p>
              <h3 className="font-serif text-xl mt-1">{draft.brand?.en}</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {draft.area?.en} · {draft.city?.en} — {draft.tagline?.en}
              </p>
              <div className="mt-3 flex gap-2 items-center">
                <span className="text-xs text-[var(--text-tertiary)]">Palette:</span>
                {Object.entries(draft.palette || {}).slice(0, 11).map(([k, v]) => (
                  <span key={k} title={`${k}: ${v}`}
                    className="inline-block w-5 h-5 rounded border border-[var(--border)]"
                    style={{ background: v }} />
                ))}
              </div>
              <p className="mt-3 text-sm">
                <strong>{draft.landmarks?.length || 0} landmarks:</strong>{" "}
                {(draft.landmarks || []).map((l) => l.name?.en).filter(Boolean).join(", ")}
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Centre: {draft.map?.center?.lat?.toFixed(4)}, {draft.map?.center?.lng?.toFixed(4)}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={download} className="btn-ghost text-sm inline-flex items-center gap-1" data-testid="clone-download">
                <Download size={14} /> Download JSON
              </button>
              <button
                onClick={() => onApply(draft)}
                className="btn-primary text-sm inline-flex items-center gap-1 flex-1"
                data-testid="clone-apply"
              >
                Apply as overrides (reversible)
              </button>
            </div>
            <button onClick={() => setDraft(null)} className="btn-ghost text-sm w-full">
              ← Draft another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAreaPage() {
  const { user } = useAuth();
  const area = useArea();
  const isAdmin = user && user !== false && user.role === "admin";
  const [tab, setTab] = useState("brand");
  const [draft, setDraft] = useState(null);   // the overrides doc being edited
  const [effective, setEffective] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const reload = async () => {
    const { data } = await api.get("/admin/area-settings");
    // Seed the draft with the effective config so the admin sees the
    // current state (defaults + overrides) and can edit from there.
    setDraft(data.effective);
    setEffective(data.effective);
    if (data.effective?.palette) {
      const root = document.documentElement;
      Object.entries(data.effective.palette).forEach(([k, v]) => root.style.setProperty(`--${k}`, v));
    }
  };

  useEffect(() => { if (isAdmin) reload(); /* eslint-disable-next-line */ }, [isAdmin]);

  // Live-apply palette edits to :root so the admin sees colours change in real time.
  useEffect(() => {
    if (!draft?.palette) return;
    const root = document.documentElement;
    Object.entries(draft.palette).forEach(([k, v]) => v && root.style.setProperty(`--${k}`, v));
  }, [draft?.palette]);

  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (!isAdmin) return <NotAdmin />;
  if (!draft) return <p className="p-10 text-[var(--text-tertiary)]">Loading…</p>;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      // Only send fields that differ from the bare JSON defaults — but the
      // simplest correct behaviour is to send every top-level field on the
      // draft. The backend shallow-merges them, so pushing values equal to
      // defaults is a no-op. (Re-import if you want to wipe.)
      const { data } = await api.patch("/admin/area-settings", {
        brand: draft.brand, area: draft.area, city: draft.city, tagline: draft.tagline,
        map: draft.map, palette: draft.palette, landmarks: draft.landmarks,
      });
      setEffective(data.effective);
      setSavedAt(new Date());
    } catch (err) {
      setError(formatApiError(err?.response?.data?.detail) || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm("Remove every override and fall back to area.config.json on disk?")) return;
    setBusy(true); setError(null);
    try {
      await api.delete("/admin/area-settings");
      await reload();
    } catch (err) {
      setError(formatApiError(err?.response?.data?.detail) || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const applyCloneDraft = async (draftJson) => {
    setBusy(true); setError(null);
    try {
      await api.post("/admin/area-import", draftJson);
      setWizardOpen(false);
      await reload();
      setSavedAt(new Date());
    } catch (err) {
      setError(formatApiError(err?.response?.data?.detail) || "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-10 pb-32 max-w-4xl mx-auto" data-testid="admin-area-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow">Admin · Template</p>
          <h1 className="font-serif text-4xl mt-2">Area Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Editing <span className="font-mono">{effective?.slug}</span>. Changes overlay <code className="text-xs bg-[var(--bg)] px-1 rounded">area.config.json</code> and are stored in Mongo (reversible).
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="btn-ghost text-sm">← POIs</Link>
          <button
            onClick={() => setWizardOpen(true)}
            className="btn-ghost text-sm inline-flex items-center gap-1"
            data-testid="area-clone-wizard-btn"
            title="AI-draft a starter config for a new city"
          >
            <Wand2 size={14} /> Clone to new city
          </button>
          <button onClick={resetAll} className="btn-ghost text-sm inline-flex items-center gap-1" data-testid="area-reset-btn">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={save} disabled={busy} className="btn-primary inline-flex items-center gap-1 text-sm" data-testid="area-save-btn">
            <Save size={14} /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {wizardOpen && <CloneWizardModal onClose={() => setWizardOpen(false)} onApply={applyCloneDraft} />}

      {error && <p className="mt-3 text-sm text-[var(--terracotta)]" data-testid="area-error">{error}</p>}
      {savedAt && !error && (
        <p className="mt-3 text-sm text-[var(--deep-green)]" data-testid="area-saved">
          Saved at {savedAt.toLocaleTimeString()} — refresh the landing page to see the changes.
        </p>
      )}

      <div className="mt-6 border-b border-[var(--border)] flex gap-1 overflow-x-auto">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === tb.id
                ? "border-[var(--terracotta)] text-[var(--terracotta)] font-medium"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            data-testid={`area-tab-${tb.id}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "brand"     && <BrandTab     draft={draft} setDraft={setDraft} />}
        {tab === "map"       && <MapTab       draft={draft} setDraft={setDraft} />}
        {tab === "landmarks" && <LandmarksTab draft={draft} setDraft={setDraft} />}
        {tab === "io"        && <IOTab        reload={reload} />}
      </div>
    </div>
  );
}
