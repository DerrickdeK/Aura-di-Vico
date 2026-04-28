import React from "react";

// Replaces the previous nested ternary
//   busy ? "Saving…" : editing === "new" ? "Create POI" : "Save changes"
function getSaveLabel({ busy, isNew }) {
  if (busy) return "Saving…";
  if (isNew) return "Create POI";
  return "Save changes";
}

export default function POIForm({ form, setForm, isNew, busy, error, onSubmit, onCancel }) {
  const update = (patch) => setForm({ ...form, ...patch });

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
        <label className="eyebrow block mb-1">Category</label>
        <input className="input-field" required value={form.category}
          onChange={(e) => update({ category: e.target.value })} />
      </div>
      <div>
        <label className="eyebrow block mb-1">Address</label>
        <input className="input-field" required value={form.address}
          onChange={(e) => update({ address: e.target.value })} />
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
