import { useEffect, useRef } from "react";
import { vibrate, vibrationPatternFor, stopVibration } from "../lib/geo";

/**
 * Continuous "the city is humming on your wrist" haptic.
 *
 * Independent of the discrete zone-entry signatures fired by useCityWhispers,
 * this hook re-issues a navigator.vibrate() call every ~1.6 s, with a pattern
 * whose pulse length and pause length scale smoothly with the distance to the
 * nearest POI. The closer you walk, the tighter the heartbeat.
 *
 * Stops vibrating outside ~4× the trigger radius, or when `enabled` is false.
 */
const TICK_MS = 1600;

export default function useGradientHaptic({ nearest, enabled }) {
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled || !nearest) {
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
      if (now - lastRef.current >= TICK_MS) {
        const pattern = vibrationPatternFor(nearest.distance, triggerR);
        if (pattern) vibrate(pattern);
        lastRef.current = now;
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [nearest, enabled]);
}
