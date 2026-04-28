import { devWarn } from "./log";

// Tiny helper around Web Audio API to play a soft "whisper" chime.
// Lazily creates a single AudioContext (browsers require user gesture).

let ctx = null;
function getCtx() {
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** Resume the AudioContext if it was suspended (Safari/Chrome autoplay policy). */
export async function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    try { await c.resume(); } catch (e) { devWarn("AudioContext resume failed", e); }
  }
}

/** Plays a soft sine "tink", optionally with a second harmonic. */
export function playChime({ frequency = 660, duration = 0.55, volume = 0.18 } = {}) {
  const c = getCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch (e) {
    devWarn("Chime failed:", e);
  }
}

/** Three-zone audio palette. */
export const CHIMES = {
  sensed: { frequency: 520, duration: 0.45, volume: 0.12 },
  called: { frequency: 660, duration: 0.7, volume: 0.18 },
  found:  { frequency: 880, duration: 0.9, volume: 0.22 },
};
