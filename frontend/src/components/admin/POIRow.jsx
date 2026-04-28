import React from "react";
import { Pencil, Trash2 } from "lucide-react";

export default function POIRow({ poi, onEdit, onDelete }) {
  return (
    <li
      className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3"
      data-testid={`admin-row-${poi.id}`}
    >
      <img
        src={poi.image_url}
        alt={poi.name}
        className="w-14 h-14 rounded-xl object-cover"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
      <div className="flex-1 min-w-0">
        <p className="eyebrow truncate">{poi.category}</p>
        <p className="font-serif text-lg leading-tight truncate">{poi.name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)} · {poi.trigger_radius_m}m
        </p>
      </div>
      <button
        onClick={() => onEdit(poi)}
        className="p-2 rounded-full hover:bg-[var(--bg)]"
        data-testid={`admin-edit-${poi.id}`}
        aria-label={`Edit ${poi.name}`}
      >
        <Pencil size={16} strokeWidth={1.5} />
      </button>
      <button
        onClick={() => onDelete(poi.id)}
        className="p-2 rounded-full hover:bg-[var(--bg)] text-[var(--terracotta)]"
        data-testid={`admin-delete-${poi.id}`}
        aria-label={`Delete ${poi.name}`}
      >
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </li>
  );
}
