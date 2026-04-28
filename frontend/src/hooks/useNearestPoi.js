import { useMemo } from "react";
import { distanceMeters, bearingDeg } from "../lib/geo";

/**
 * Given the user position and a list of POIs, returns the nearest one with
 * its distance (meters) and bearing (degrees), or null when not computable.
 */
export default function useNearestPoi(position, pois) {
  return useMemo(() => {
    if (!position || !pois || pois.length === 0) return null;
    let best = null;
    for (const p of pois) {
      const d = distanceMeters(position, p);
      if (!best || d < best.distance) {
        best = { poi: p, distance: d, bearing: bearingDeg(position, p) };
      }
    }
    return best;
  }, [position, pois]);
}
