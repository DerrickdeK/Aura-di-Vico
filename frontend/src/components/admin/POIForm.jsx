import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import POICoordPicker from "./POICoordPicker";

const ALL_INTERESTS = [
  "local_legends", "curios", "art", "history",
  "architecture", "sceneries", "food", "shopping",
];
const INTEREST_LABELS = {
  local_legends: "Local legends",
  curios: "Curiosities",
  art: "Art",
  history: "History",
  architecture: "Architecture",
  sceneries: "Sceneries",
  food: "Food",
  shopping: "Shopping",
};

// Replaces the previous nested ternary
//   busy ? "Saving…" : editing === "new" ? "Create POI" : "Save changes"
function getSaveLabel({ busy, isNew }) {
  if (busy) return "Saving…";
  if (isNew) return "Create POI";
  return "Save changes";
}

export default function POIForm({ form, setForm, isNew, busy, error, onSubmit, onCancel }) {
  const update = (patch) => setForm({ ...form, ...patch });

  const [supportedLangs, setSupportedLangs] = useState(["en", "it"]);
  useEffect(() => {
    api.get("/config")
      .then(({ data }) => data?.supported_languages && setSupportedLangs(data.supported_languages))
      .catch(() => {});
  }, []);

  const toggleTag = (tag) => {
    const current = Array.isArray(form.interest_tags) ? form.interest_tags : [];
    update({
      interest_tags: current.includes(tag)
        ? current.filter((x) => x !== tag)
        : [...current, tag],
    });
  };

  const setOpeningLine = (lang, text) => {
    update({ opening_line: { ...(form.opening_line || {}), [lang]: text } });
  };

  // canonical_facts is a flat list of authoritative single-line statements.
  // We edit them as a single textarea (one fact per line) for simplicity.
  const canonicalText = Array.isArray(form.canonical_facts)
    ? form.canonical_facts.join("\n")
    : "";
  const setCanonicalText = (text) => {
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    update({ canonical_facts: lines });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 grid gap-3 sm:grid-cols-2"
      data-testid="admin-form"
    >
      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">Name</label>
        <input
          className="input-field"
          required
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          data-testid="admin-form-name"
        />
      </div>
      <div>
        <label className="eyebrow block mb-1">Category (label only)</label>
        <input className="input-field" required value={form.category}
          onChange={(e) => update({ category: e.target.value })} />
      </div>
      <div>
        <label className="eyebrow block mb-1">Address</label>
        <input className="input-field" required value={form.address}
          onChange={(e) => update({ address: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">Pin on map</label>
        <POICoordPicker
          latitude={form.latitude}
          longitude={form.longitude}
          address={form.address}
          onChange={(lat, lng) => update({ latitude: lat, longitude: lng })}
        />
      </div>
      <div>
        <label className="eyebrow block mb-1">Latitude</label>
        <input className="input-field" required type="number" step="any" value={form.latitude}
          onChange={(e) => update({ latitude: e.target.value })} />
      </div>
      <div>
        <label className="eyebrow block mb-1">Longitude</label>
        <input className="input-field" required type="number" step="any" value={form.longitude}
          onChange={(e) => update({ longitude: e.target.value })} />
      </div>
      <div>
        <label className="eyebrow block mb-1">Trigger radius (m)</label>
        <input className="input-field" type="number" min="10" max="500" value={form.trigger_radius_m}
          onChange={(e) => update({ trigger_radius_m: e.target.value })} />
      </div>
      <div>
        <label className="eyebrow block mb-1">Hours</label>
        <input className="input-field" value={form.hours || ""}
          onChange={(e) => update({ hours: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">Image URL</label>
        <input className="input-field" required value={form.image_url}
          onChange={(e) => update({ image_url: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">Short description</label>
        <input className="input-field" required value={form.short_description}
          onChange={(e) => update({ short_description: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">Long description</label>
        <textarea className="input-field" rows={4} required value={form.long_description}
          onChange={(e) => update({ long_description: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">Fun fact (optional)</label>
        <input className="input-field" value={form.fun_fact || ""}
          onChange={(e) => update({ fun_fact: e.target.value })} />
      </div>

      <div className="sm:col-span-2">
        <label className="eyebrow block mb-1">
          Canonical facts (one per line — authoritative for AI dialogue)
        </label>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          These take precedence over crowd-sourced memories when the place
          speaks. Use short sentences. Example: <em>Founded 1774 by Maria
          Theresa of Austria.</em>
        </p>
        <textarea
          className="input-field"
          rows={4}
          value={canonicalText}
          onChange={(e) => setCanonicalText(e.target.value)}
          data-testid="admin-form-canonical-facts"
          placeholder={"Founded 1774 by Maria Theresa of Austria.\nTwo of its ginkgo biloba trees are over 240 years old.\nFree entry on the first Sunday of each month."}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="eyebrow block mb-2">Interest tags (used to match user interests)</label>
        <div className="flex flex-wrap gap-2">
          {ALL_INTERESTS.map((tag) => {
            const active = (form.interest_tags || []).includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  active
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--inverse)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
                data-testid={`admin-form-tag-${tag}`}
              >
                {INTEREST_LABELS[tag]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="eyebrow block mb-2">
          Opening line — the city's whisper, per language
        </label>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          One short, evocative sentence. Shown when the visitor enters the &quot;called&quot; zone.
          English is the fallback — leave the others empty if you don&apos;t use them.
        </p>
        <div className="space-y-2">
          {supportedLangs.map((code) => (
            <div key={code} className="flex items-center gap-2">
              <span className="eyebrow w-10 text-center" style={{ fontSize: "0.65rem" }}>{code}</span>
              <input
                className="input-field flex-1"
                value={(form.opening_line && form.opening_line[code]) || ""}
                onChange={(e) => setOpeningLine(code, e.target.value)}
                data-testid={`admin-form-opening-${code}`}
                placeholder={code === "en" ? "Behind this wall, …" : ""}
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="sm:col-span-2 text-sm text-[var(--terracotta)]">{error}</p>}
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button
          type="submit"
          className="btn-primary"
          disabled={busy}
          data-testid="admin-form-save"
        >
          {getSaveLabel({ busy, isNew })}
        </button>
      </div>
    </form>
  );
}

