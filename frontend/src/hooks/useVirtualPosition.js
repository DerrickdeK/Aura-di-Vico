import { useEffect, useRef, useState, useCallback } from "react";

/** A scripted walk through Brera that visits a few POIs in sequence — used
 * when the device has no real GPS so the experience can be demoed indoors. */
export const VIRTUAL_PATH = [
  { latitude: 45.4719, longitude: 9.1881 }, // Orto Botanico / Pinacoteca courtyard
  { latitude: 45.4720, longitude: 9.1879 },
  { latitude: 45.4729, longitude: 9.1888 }, // Palazzo Cusani
  { latitude: 45.4738, longitude: 9.1874 }, // Bar Jamaica
  { latitude: 45.4742, longitude: 9.1907 }, // Fioraio Bianchi
  { latitude: 45.4754, longitude: 9.1908 }, // Latteria San Marco / Cimitero
  { latitude: 45.4736, longitude: 9.1908 }, // Cortile della Magnolia
];

const STEP_MS = 350;
const STEP_DELTA = 0.04;
const STEP_MANUAL = 0.18;

/**
 * Drives a virtual user position for users not physically in Brera.
 * Three modes:
 *   - "auto": auto-walk along VIRTUAL_PATH at a steady pace
 *   - "step": user clicks "Step forward" to advance along VIRTUAL_PATH
 *   - "drag": user drags a pin on a small map; setDragPosition() updates state
 *
 * Returns the current { latitude, longitude } or null if disabled.
 */
export default function useVirtualPosition({ enabled, mode }) {
  const [autoIdx, setAutoIdx] = useState(0);
  const [autoStep, setAutoStep] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [dragPos, setDragPos] = useState(VIRTUAL_PATH[0]);

  // Reset position state when the user disables the virtual mode
  // so re-enabling later starts fresh from the path origin.
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

  // Auto-walk timer
  useEffect(() => {
    if (!enabled || mode !== "auto") return undefined;
    const id = setInterval(() => {
      setAutoStep((s) => {
        if (s >= 1) {
          setAutoIdx((i) => (i + 1) % VIRTUAL_PATH.length);
          return 0;
        }
        return s + STEP_DELTA;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [enabled, mode]);

  const stepForward = useCallback(() => {
    setStepProgress((p) => {
      const next = p + STEP_MANUAL;
      if (next >= 1) {
        setStepIdx((i) => (i + 1) % VIRTUAL_PATH.length);
        return 0;
      }
      return next;
    });
  }, []);

  const setDragPosition = useCallback((lat, lng) => {
    setDragPos({ latitude: lat, longitude: lng });
  }, []);

  if (!enabled) return { position: null, stepForward, setDragPosition };

  if (mode === "drag") return { position: dragPos, stepForward, setDragPosition };

  if (mode === "step") {
    const a = VIRTUAL_PATH[stepIdx];
    const b = VIRTUAL_PATH[(stepIdx + 1) % VIRTUAL_PATH.length];
    return {
      position: {
        latitude: a.latitude + (b.latitude - a.latitude) * stepProgress,
        longitude: a.longitude + (b.longitude - a.longitude) * stepProgress,
      },
      stepForward,
      setDragPosition,
    };
  }

  // mode === "auto"
  const a = VIRTUAL_PATH[autoIdx];
  const b = VIRTUAL_PATH[(autoIdx + 1) % VIRTUAL_PATH.length];
  return {
    position: {
      latitude: a.latitude + (b.latitude - a.latitude) * autoStep,
      longitude: a.longitude + (b.longitude - a.longitude) * autoStep,
    },
    stepForward,
    setDragPosition,
  };
}
