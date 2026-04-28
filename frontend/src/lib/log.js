// Tiny logging helper. In production the warnings disappear so internal app
// state isn't leaked and the bundle isn't slowed down by dead-end console calls.
const isDev = process.env.NODE_ENV !== "production";

export function devWarn(...args) {
  if (isDev && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}
