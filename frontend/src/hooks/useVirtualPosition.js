import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { distanceMeters } from "../lib/geo";

/** Default starting / fallback waypoint: heart of the Brera quarter. */
const BRERA_CENTER = { latitude: 45.4720, longitude: 9.1881 };

const STEP_MS = 350;
const STEP_DELTA = 0.04;
const STEP_MANUAL = 0.18;

/**
 * Build a sensible walking route through every POI using a greedy
 * nearest-neighbour heuristic. Starts from BRERA_CENTER, then at each step
 * jumps to the closest unvisited POI. Cheap (O(n²)), good-enough for ≤50 POIs,
 * and produces a route that doesn't zig-zag wildly.
 */
function buildRoute(pois) {
  if (!pois || pois.length === 0) return [BRERA_CENTER];

  const remaining = pois.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  const route = [BRERA_CENTER];
  let here = BRERA_CENTER;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceMeters(here, remaining[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    here = remaining[bestIdx];
    route.push(here);
    remaining.splice(bestIdx, 1);
  }
  // Close the loop back to centre so auto-walk feels continuous.
  route.push(BRERA_CENTER);
  return route;
}

/**
 * Drives a virtual user position for users not physically in Brera.
 * The route is built dynamically from the provided POI list — add or
 * remove POIs in the admin and the next visit re-routes automatically.
 *
 * Three modes:
 *   - "auto": auto-walk along the route at a steady pace
 *   - "step": user clicks "Step forward" to advance one segment at a time
 *   - "drag": user drags a pin on a small map; setDragPosition() updates state
 */
export default function useVirtualPosition({ enabled, mode, pois }) {
  // Memoised route — only rebuilds when the POI list changes (by length or first id).
  const path = useMemo(() => buildRoute(pois), [pois]);
  const pathLen = path.length;

  const [autoIdx, setAutoIdx] = useState(0);
  const [autoStep, setAutoStep] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [dragPos, setDragPos] = useState(path[0] || BRERA_CENTER);

  // When the route changes (POIs added/removed), keep the indices safe.
  useEffect(() => {
    setAutoIdx((i) => (i >= pathLen ? 0 : i));
    setStepIdx((i) => (i >= pathLen ? 0 : i));
    setDragPos((p) => p || path[0] || BRERA_CENTER);
  }, [pathLen, path]);

  // Reset position state when the user disables virtual mode.
  const wasEnabledRef = useRef(false);
  useEffect(() => {
    if (!enabled && wasEnabledRef.current) {
      setAutoIdx(0);
      setAutoStep(0);
      setStepIdx(0);
      setStepProgress(0);
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  // Auto-walk timer.
  useEffect(() => {
    if (!enabled || mode !== "auto" || pathLen < 2) return undefined;
    const id = setInterval(() => {
      setAutoStep((s) => {
        if (s >= 1) {
          setAutoIdx((i) => (i + 1) % pathLen);
          return 0;
        }
        return s + STEP_DELTA;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [enabled, mode, pathLen]);

  const stepForward = useCallback(() => {
    setStepProgress((p) => {
      const next = p + STEP_MANUAL;
      if (next >= 1) {
        setStepIdx((i) => (i + 1) % Math.max(pathLen, 1));
        return 0;
      }
      return next;
    });
  }, [pathLen]);

  const setDragPosition = useCallback((lat, lng) => {
    setDragPos({ latitude: lat, longitude: lng });
  }, []);

  if (!enabled) return { position: null, stepForward, setDragPosition };

  if (mode === "drag") return { position: dragPos, stepForward, setDragPosition };

  // For step / auto modes: interpolate between current waypoint and next.
  const idx = mode === "step" ? stepIdx : autoIdx;
  const progress = mode === "step" ? stepProgress : autoStep;
  const a = path[idx] || BRERA_CENTER;
  const b = path[(idx + 1) % pathLen] || a;

  return {
    position: {
      latitude:  a.latitude  + (b.latitude  - a.latitude)  * progress,
      longitude: a.longitude + (b.longitude - a.longitude) * progress,
    },
    stepForward,
    setDragPosition,
  };
}

// Kept for backwards compatibility with anything that imports the constant.
export const VIRTUAL_PATH = [BRERA_CENTER];
