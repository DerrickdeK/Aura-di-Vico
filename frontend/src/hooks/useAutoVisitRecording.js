import { useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * Records a visit when the user enters a POI's trigger radius (debounced via
 * an in-memory set so we only POST once per POI per session).
 */
export default function useAutoVisitRecording(nearest, isAuthed) {
  const [visitedIds, setVisitedIds] = useState(() => new Set());

  useEffect(() => {
    if (!nearest || !isAuthed) return;
    const radius = nearest.poi.trigger_radius_m ?? 60;
    const id = nearest.poi.id;
    if (nearest.distance <= radius && !visitedIds.has(id)) {
      setVisitedIds((s) => {
        const next = new Set(s);
        next.add(id);
        return next;
      });
      api.post("/me/visits", { poi_id: id }).catch((err) => {
        console.warn("Failed to record visit:", err);
      });
    }
  }, [nearest, isAuthed, visitedIds]);

  return visitedIds;
}
