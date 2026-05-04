import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { api } from "./api";
import { setAreaDefaults } from "./i18n";

const AreaContext = createContext(null);

// Module-level mutable default so non-React helpers (e.g. hooks/useVirtualPosition,
// markers.js) that cannot use the React context can still pick up the area center.
export const AREA_DEFAULT_CENTER = { latitude: 45.472, longitude: 9.188 };
// Module-level mutable brand/area names for the same reason (used by
// useCityWhispers notification title which fires outside React render).
let AREA_NAME_IT = "";
let AREA_NAME_EN = "";

export function getAreaCenter() {
  return AREA_DEFAULT_CENTER;
}

export function getAreaName(lang = "it") {
  if (lang === "en") return AREA_NAME_EN || AREA_NAME_IT || "";
  return AREA_NAME_IT || AREA_NAME_EN || "";
}

// Fallback used before the /api/area fetch resolves so first paint is not blank.
const FALLBACK = {
  slug: "",
  brand: { it: "Aura", en: "Aura" },
  area: { it: "", en: "" },
  city: { it: "", en: "" },
  tagline: { it: "", en: "" },
  map: { center: { lat: 45.472, lng: 9.188 }, default_zoom: 15, landing_zoom: 14 },
  palette: {},
  landmarks: [],
};

function applyPalette(palette) {
  if (!palette) return;
  const root = document.documentElement;
  Object.entries(palette).forEach(([k, v]) => {
    root.style.setProperty(`--${k}`, v);
  });
}

export function AreaProvider({ children }) {
  const [area, setArea] = useState(FALLBACK);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Forward the browser URL's ?tenant= to the API so the preview can
    // switch cities without a subdomain (main-app deploys can rely on
    // subdomain resolution instead).
    const search = typeof window !== "undefined" ? window.location.search : "";
    const tenant = new URLSearchParams(search).get("tenant");
    const path = tenant ? `/area?tenant=${encodeURIComponent(tenant)}` : "/area";
    api.get(path)
      .then(({ data }) => {
        if (cancelled) return;
        setArea(data);
        applyPalette(data.palette);
        if (data?.map?.center) {
          AREA_DEFAULT_CENTER.latitude = data.map.center.lat;
          AREA_DEFAULT_CENTER.longitude = data.map.center.lng;
        }
        if (data?.area) {
          AREA_NAME_IT = data.area.it || data.area.en || AREA_NAME_IT;
          AREA_NAME_EN = data.area.en || data.area.it || AREA_NAME_EN;
        }
        setAreaDefaults({
          brand: data.brand || {},
          area: data.area || {},
          city: data.city || {},
          tagline: data.tagline || {},
        });
        setReady(true);
      })
      .catch(() => {
        // Keep fallback — rendering still works with hardcoded defaults.
        setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ ...area, ready }), [area, ready]);
  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea must be used within AreaProvider");
  return ctx;
}

/** Helper: pull the localised string from {en, it, ...} with sensible fallbacks. */
export function pickLocale(map, lang) {
  if (!map || typeof map !== "object") return "";
  return map[lang] || map.it || map.en || Object.values(map)[0] || "";
}
