import { useEffect, useRef } from "react";
import { vibrate, vibrationPatternFor, stopVibration } from "../lib/geo";

const VIBRATE_INTERVAL_MS = 1800;
const TICK_MS = 600;

/**
 * Re-issues a navigator.vibrate() call every ~2 seconds whose pattern intensifies
 * as `nearest.distance` shrinks. Stops vibration when disabled or out of range.
 */
export default function useProximityVibration(nearest, enabled) {
  const lastVibrateRef = useRef(0);

  useEffect(() => {
    if (!nearest || !enabled) {
      stopVibration();
      return undefined;
    }
    const triggerR = nearest.poi.trigger_radius_m ?? 60;
    if (nearest.distance > triggerR * 4) {
      stopVibration();
      return undefined;
    }
    const tick = () => {
      const now = Date.now();
      if (now - lastVibrateRef.current >= VIBRATE_INTERVAL_MS) {
        const pattern = vibrationPatternFor(nearest.distance, triggerR);
        if (pattern) vibrate(pattern);
        lastVibrateRef.current = now;
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [nearest, enabled]);
}
